const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const catchAsync = require("../utils/catchAsync");

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt; 
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token || token === "loggedout") {
    return res
      .status(401)
      .json({ message: "You are not logged in. Please login to get access." });
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 🔍 FIXED: Query from public.mlas instead of public.users
  const currentMla = await pool.query("SELECT * FROM mlas WHERE id = $1", [
    decoded.id,
  ]);

  if (currentMla.rows.length === 0) {
    return res
      .status(401)
      .json({ message: "The user belonging to this token no longer exists." });
  }

  const mlaData = currentMla.rows[0];

  // Grant access to protected route by attaching to request context safely
  req.user = mlaData; 
  
  // 🌟 CRITICAL: Populate req.mla so your authorize() middleware and MLA analytics work seamlessly!
  req.mla = {
    id: mlaData.id,
    name: mlaData.name,
    mobile: mlaData.mobile,
    role: mlaData.role || 'mla', // Fallback to 'mla' if role field isn't explicitly set in table yet
    pc_id: mlaData.pc_id,
    ac_id: mlaData.ac_id
  };

  next();
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Verified via req.mla context generated above
    if (!req.mla || !roles.includes(req.mla.role)) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission.' });
    }
    next();
  };
};