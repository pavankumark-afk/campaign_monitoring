const pool = require('../config/db');
const { getIo, getActiveSockets } = require('../config/socket');

// Requirement 4: Super Admin Uploads and Multi-Target Notifications
exports.uploadAndDistribute = async (req, res) => {
  const { title, fileType, content, targetType, specificIds } = req.body; 
  // targetType options: 'ALL', 'SPECIFIC'
  const filePath = req.file ? `/uploads/${req.file.filename}` : null;
  const senderId = req.mla.id;

  try {
    await pool.query('BEGIN');

    const docResult = await pool.query(
      'INSERT INTO documents (title, file_path, file_type, content, sender_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, filePath, fileType, content, senderId]
    );
    const document = docResult.rows[0];

    // Determine target recipient IDs
    let targetMlaIds = [];
    if (targetType === 'ALL') {
      const mlaQuery = await pool.query("SELECT id FROM mlas WHERE role IN ('mla', 'admin')");
      targetMlaIds = mlaQuery.rows.map(r => r.id);
    } else if (targetType === 'SPECIFIC') {
      targetMlaIds = JSON.parse(specificIds); // e.g., [3, 5, 8]
    }

    // Insert mapping records into Junction table
    const io = getIo();
    const activeSockets = getActiveSockets();

    for (let recipientId of targetMlaIds) {
      await pool.query('INSERT INTO document_recipients (document_id, recipient_id) VALUES ($1, $2)', [document.id, recipientId]);
      
      // Dispatch real-time WebSocket Alert if recipient is actively online
      const socketId = activeSockets.get(recipientId);
      if (socketId) {
        io.to(socketId).emit('new_notification', { message: `New Document Posted: ${title}`, document });
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ message: 'Document distributed successfully.', document });
  } catch (err) {
    await pool.query('ROLLBACK');
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
        
        -- Metric 1: Total absolute download events across everyone
        COALESCE(COUNT(dl.id), 0)::INT AS total_download_count,
        
        -- Metric 2: Total unique people/MLAs who have downloaded it at least once
        COALESCE(COUNT(DISTINCT dl.mla_id), 0)::INT AS unique_people_downloaded,
        
        -- Metric 3: Sub-query generating an array of JSON objects containing each MLA's individual stats
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