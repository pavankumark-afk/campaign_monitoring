const pool = require('../config/db');
const { getIo, getActiveSockets } = require('../config/socket');
const bucket = require('../config/firebase'); // Your Firebase Storage Bucket initialization
const Multer = require('multer');

// Configure Multer to intercept raw streaming binary payloads directly into memory buffer
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // Safe execution ceiling: 50MB per single document file
});

// Middleware hook exposed to target routes
exports.uploadMiddleware = multer.single('file');

function parseSpecificIds(rawValue) {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Requirement 4: Super Admin Uploads to Firebase and Multi-Target Notifications
exports.uploadAndDistribute = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a file to upload.' });
    }

    const { title, fileType, content, targetType, specificIds } = req.body; 
    const senderId = req.mla.id;

    // Step A: Stream memory buffer chunk payload straight out into Firebase Bucket
    const firebaseFileName = `documents/${Date.now()}_${req.file.originalname}`;
    const blob = bucket.file(firebaseFileName);
    const blobStream = blob.createWriteStream({
      metadata: { contentType: req.file.mimetype },
    });

    blobStream.on('error', (err) => {
      throw new Error(`Firebase Stream Interruption: ${err.message}`);
    });

    blobStream.on('finish', async () => {
      // Generate a permanent signed URL asset token path
      const [fileUrl] = await blob.getSignedUrl({
        action: 'read',
        expires: '01-01-2050',
      });

      // Step B: Initialize Transactional state tracking on Postgres Engine
      try {
        await pool.query('BEGIN');

        const docResult = await pool.query(
          `INSERT INTO documents (title, file_path, file_type, content, sender_id, firebase_storage_path) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [title, fileUrl, fileType, content, senderId, blob.name]
        );
        const document = docResult.rows[0];

        // Determine target recipient IDs
        let targetMlaIds = [];
        if (targetType === 'ALL') {
          const mlaQuery = await pool.query("SELECT id FROM mlas WHERE role = 'ac'");
          targetMlaIds = mlaQuery.rows.map(r => r.id);
        } else if (targetType === 'SPECIFIC') {
          const requestedIds = parseSpecificIds(specificIds);
          const numericIds = requestedIds.filter((value) => Number.isInteger(value));
          const acCodes = requestedIds.filter((value) => typeof value === 'string' && value.trim());

          if (acCodes.length > 0) {
            const recipients = await pool.query(
              "SELECT id FROM mlas WHERE role = 'ac' AND ac_id = ANY($1::text[])",
              [acCodes]
            );
            numericIds.push(...recipients.rows.map((row) => row.id));
          }

          targetMlaIds = [...new Set(numericIds.map((value) => Number(value)).filter(Number.isInteger))];
        }

        if (targetMlaIds.length === 0) {
          await pool.query('ROLLBACK');
          // Purge orphaned file back off storage mirror if database validation falls through
          await blob.delete().catch(() => {});
          return res.status(400).json({ error: 'No valid AC recipients were selected.' });
        }

        // Insert mapping records into Junction table and trigger socket alert pings
        const io = getIo();
        const activeSockets = getActiveSockets();

        for (let recipientId of targetMlaIds) {
          await pool.query('INSERT INTO document_recipients (document_id, recipient_id) VALUES ($1, $2)', [document.id, recipientId]);
          
          const socketId = activeSockets.get(recipientId);
          if (socketId) {
            io.to(socketId).emit('new_notification', { message: `New Document Posted: ${title}`, document });
          }
        }

        await pool.query('COMMIT');
        res.status(201).json({ message: 'Document distributed successfully.', document });
      } catch (dbErr) {
        await pool.query('ROLLBACK');
        await blob.delete().catch(() => {}); // Cleanup uploaded file if transaction fails
        throw dbErr;
      }
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error("Upload/Distribute Loop Failure: ", err.message);
    res.status(500).json({ error: err.message });
  }
};

// NEW: Clean out deletion routine targeting both tracking rows and live Firebase storage files
exports.deleteDocument = async (req, res) => {
  const { docId } = req.params;
  try {
    const docLookup = await pool.query('SELECT firebase_storage_path FROM documents WHERE id = $1', [docId]);
    
    if (docLookup.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found in database records.' });
    }

    const { firebase_storage_path } = docLookup.rows[0];

    // Step A: Evict the binary file asset off your Firebase Storage console
    if (firebase_storage_path) {
      await bucket.file(firebase_storage_path).delete().catch((err) => {
        console.warn('File already cleared out or missing from Firebase Console bucket repository, moving to clean database records...', err.message);
      });
    }

    // Step B: Cascade row elimination locally inside Postgres tracking maps
    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);

    res.status(200).json({ success: true, message: 'Document cleanly purged from Firebase and database system metrics.' });
  } catch (err) {
    console.error("Delete Endpoint Runtime Error: ", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Fetch all uploaded documents for Admins and MLAs to view
exports.getAvailableDocuments = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        title, 
        file_type, 
        file_path, -- Extends standard signed path references straight to your user downloads index 
        created_at 
      FROM documents 
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json({ success: true, count: result.rows.length, documents: result.rows });
  } catch (err) {
    console.error("Fetch Documents Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Track and record metric metrics upon Download
exports.downloadDocument = async (req, res) => {
  const { docId } = req.params;
  const mlaId = req.mla.id;
  try {
    await pool.query('INSERT INTO download_logs (document_id, mla_id) VALUES ($1, $2)', [docId, mlaId]);
    const docResult = await pool.query('SELECT file_path FROM documents WHERE id = $1', [docId]);
    res.status(200).json({ downloadUrl: docResult.rows[0].file_path });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Super Admin Metric View
exports.getDocumentDetailedMetrics = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id AS document_id,
        d.title AS document_title,
        d.file_type,
        COALESCE(COUNT(dl.id), 0)::INT AS total_download_count,
        COALESCE(COUNT(DISTINCT dl.mla_id), 0)::INT AS unique_people_downloaded,
        COALESCE(
          (
            SELECT json_agg(mla_breakdown)
            FROM (
              SELECT 
                m.id AS mla_id,
                m.name AS mla_name,
                m.mobile AS mla_mobile,
                COUNT(sub_dl.id)::INT AS times_downloaded
              FROM download_logs sub_dl
              JOIN mlas m ON sub_dl.mla_id = m.id
              WHERE sub_dl.document_id = d.id
              GROUP BY m.id, m.name, m.mobile
              ORDER BY times_downloaded DESC
            ) mla_breakdown
          ), 
          '[]'::json
        ) AS each_mla_download_breakdown
      FROM documents d
      LEFT JOIN download_logs dl ON d.id = dl.document_id
      GROUP BY d.id
      ORDER BY d.created_at DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Metrics Generation Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};