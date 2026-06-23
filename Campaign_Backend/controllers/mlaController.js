const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Requirement 1: Register accounts & return plain password for delivery
exports.registerMlaOrAdmin = async (req, res) => {
  const { name, mobile, address, pc_id, ac_id, role, plainPassword } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    const result = await pool.query(
      `INSERT INTO mlas (name, mobile, password_hash, plain_password, address, pc_id, ac_id, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, role`,
      [name, mobile, passwordHash, plainPassword, address, pc_id, ac_id, role]
    );

    res.status(201).json({
      message: 'Registration successful',
      account: result.rows[0],
      actionRequired: `Share this temporary password securely with the user: ${plainPassword}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Requirement 3: Reset password & Toggle Idle status
exports.updateAccountStatus = async (req, res) => {
  const { id } = req.params;
  const { status, newPlainPassword } = req.body;
  
  try {
    // If a new password is provided, update BOTH the hash and plain text column
    if (newPlainPassword) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPlainPassword, salt);
      
      const passwordQuery = `
        UPDATE mlas 
        SET password_hash = $1, plain_password = $2 
        WHERE id = $3
      `;
      await pool.query(passwordQuery, [passwordHash, newPlainPassword, id]);
    }
    
    // If status toggle is provided (active/idle)
    if (status) {
      await pool.query('UPDATE mlas SET status = $1 WHERE id = $2', [status, id]);
    }
    
    res.status(200).json({ message: 'Account status updated successfully.' });
  } catch (err) {
    console.error("Update Account Error: ", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Requirement 5: Activity Dashboard Monitoring (Super Admin / Admin view)
exports.monitorActions = async (req, res) => {
  try {
    const query = `
      SELECT id, name, mobile, role, status, last_login,
      (SELECT COUNT(*) FROM download_logs WHERE mla_id = mlas.id) as total_downloads
      FROM mlas WHERE role != 'super_admin'
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};