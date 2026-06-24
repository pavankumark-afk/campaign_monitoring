const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// exports.login = async (req, res) => {
//   const { mobile, password } = req.body;
//   try {
//     const result = await pool.query('SELECT * FROM mlas WHERE mobile = $1', [mobile]);
//     if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid mobile or password.' });

//     const account = result.rows[0];
//     if (account.status === 'idle') return res.status(403).json({ error: 'Account is deactivated (Idle).' });

//     const validPassword = await bcrypt.compare(password, account.password_hash);
//     if (!validPassword) return res.status(400).json({ error: 'Invalid mobile or password.' });

//     // Update last login
//     await pool.query('UPDATE mlas SET last_login = NOW() WHERE id = $1', [account.id]);

//     const token = jwt.sign({ id: account.id, role: account.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
//     res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict' }); // set secure: true in production
//     res.status(200).json({ message: 'Login successful', role: account.role });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


exports.login = async (req, res) => {
  const { mobile, password } = req.body;
  
  console.log("Postman Received: ", mobile, password);

  try {
    const result = await pool.query('SELECT * FROM mlas WHERE mobile = $1', [mobile]);
    
    console.log("Database Rows Found: ", result.rows);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid mobile or password. (Reason: Mobile not found)' });
    }

    const account = result.rows[0];
    if (account.status === 'idle') {
      return res.status(403).json({ error: 'Account is deactivated (Idle).' });
    }

    // 1. RE-ENABLED: Compare incoming plain-text password with the stored hash
    const validPassword = await bcrypt.compare(password, account.password_hash);
    
    console.log("Is Bcrypt Hash Valid?: ", validPassword);

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid mobile or password. (Reason: Password Hash mismatch)' });
    }

    // Update last login timestamp
    await pool.query('UPDATE mlas SET last_login = NOW() WHERE id = $1', [account.id]);

    const token = jwt.sign({ id: account.id, role: account.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
   // Replace your current res.cookie line with this:
res.cookie('token', token, { 
  httpOnly: true, 
  secure: process.env.NODE_ENV === 'production', // true in production (requires HTTPS), false in local dev
  sameSite: 'lax',                               // 'lax' is much more forgiving for local development cross-port environments
  maxAge: 24 * 60 * 60 * 1000                    // 1 day in milliseconds (explicitly sets cookie lifespan)
});
    res.status(200).json({ 
      message: 'Login successful', 
      role: account.role,
      id: account.id,
      name: account.name,
      ac_id: account.ac_id ?? null,
      ac_name: account.ac_name ?? null
    });
  } catch (err) {
    console.error("Database Runtime Error: ", err);
    res.status(500).json({ error: err.message });
  }
};


exports.logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully.' });
};