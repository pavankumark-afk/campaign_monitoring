const pool = require("../config/db");
const { sendOTPSMS } = require("../services/smsService");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Native crypto package

// Helper function to create an un-reversible SHA-256 hash of the OTP
const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

const getSessionCookieOptions = (req, expires) => {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";

  return {
    expires,
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path: "/",
  };
};

// 1. REQUEST OTP (Only for existing users + Smart Un-registered Session Bypass)
exports.requestOTP = catchAsync(async (req, res, next) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    return res.status(400).json({ status: "fail", message: "Please provide a mobile number." });
  }

  // Fetch BOTH active_session_count AND is_registered status
  const userCheck = await pool.query(
    "SELECT active_session_count, is_registered FROM mlas WHERE mobile = $1", 
    [mobileNumber]
  );

  // NEW: Strict Security Guard - Check if the mobile number actually exists in the DB
  if (userCheck.rows.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "This mobile number is not registered in our system. Access denied."
    });
  }

  const user = userCheck.rows[0];
  
  // Core Bugfix Check: Only block if they have a session AND they are fully registered.
  // If is_registered is false, we ignore active_session_count so they don't get trapped.
  if (user.active_session_count > 0 && user.is_registered === true) {
    return res.status(400).json({
      status: "fail",
      message: "This account already has an active session on another device. Please logout from that device first."
    });
  }

  // Cryptographically secure 6-digit random number generation
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 
  const secureOtpHash = hashOTP(otp);

  // Send via Mtalkz API
  await sendOTPSMS(mobileNumber, otp);

  // Store/Update secure hash in database
  await pool.query(
    `INSERT INTO otp_store (mobile, otp_hash, expires_at) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (mobile) DO UPDATE 
     SET otp_hash = EXCLUDED.otp_hash, expires_at = EXCLUDED.expires_at`,
    [mobileNumber, secureOtpHash, expiresAt]
  );

  res.status(200).json({ status: "success", message: "OTP sent to mobile safely" });
});


// 2. VERIFY OTP & LOGIN (With Session Counter Increments)

exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    return res.status(400).json({ status: "fail", message: "Mobile number and OTP are required." });
  }

  // Hash user input to safely compare with the database storage log
  const incomingOtpHash = hashOTP(otp);

  // Look for active match record
  const otpResult = await pool.query(
    "SELECT * FROM otp_store WHERE mobile = $1 AND expires_at > NOW()",
    [mobileNumber],
  );

  if (otpResult.rows.length === 0) {
    return res.status(401).json({ status: "fail", message: "Invalid or expired OTP token." });
  }

  const storedRecord = otpResult.rows[0];

  // STRICT RULE: Burn the OTP record IMMEDIATELY so it cannot be reused or brute-forced
  await pool.query("DELETE FROM otp_store WHERE mobile = $1", [mobileNumber]);

  // Check matching state against hashed values
  if (storedRecord.otp_hash !== incomingOtpHash) {
    return res.status(401).json({ status: "fail", message: "Invalid or expired OTP token." });
  }

 // Check if User exists, if not, Create a base record with registration set to false
  let user = await pool.query("SELECT * FROM mlas WHERE mobile = $1", [mobileNumber]);

  if (user.rows.length === 0) {
    user = await pool.query(
      `INSERT INTO mlas (mobile, active_session_count, is_registered) 
       VALUES ($1, 1, false) 
       RETURNING *`,
      [mobileNumber],
    );
  } else {
    // BUGFIX: If they were NOT registered, override any orphaned ghost sessions and enforce a clean value of 1.
    if (user.rows[0].is_registered === false) {
      user = await pool.query(
        "UPDATE mlas SET active_session_count = 1 WHERE id = $1 RETURNING *",
        [user.rows[0].id]
      );
    } else {
      // If they are a normal fully registered user, proceed with standard incrementing
      user = await pool.query(
        "UPDATE mlas SET active_session_count = COALESCE(active_session_count, 0) + 1 WHERE id = $1 RETURNING *",
        [user.rows[0].id]
      );
    }
  }

  // Create JWT
  const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const cookieOptions = getSessionCookieOptions(
    req,
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  res.cookie("jwt", token, cookieOptions);

  // Expose registration status flag cleanly so frontend can decide whether to skip the form or not
  res.status(200).json({
    status: "success",
    data: { 
      user: {
        id: user.rows[0].id,
        mobile: user.rows[0].mobile,
        name: user.rows[0].name,
        role: user.rows[0].role,
        address: user.rows[0].address,
        pc_id: user.rows[0].pc_id,
        ac_id: user.rows[0].ac_id,
        is_registered: user.rows[0].is_registered,
      }
    },
  });
});



// 3. LOGOUT (With Session Counter Decrements)

exports.logout = catchAsync(async (req, res, next) => {
  // Check if req.user exists (Injected safely via your protect middleware layer)
  if (req.user && req.user.id) {
    // Decrement counter but use GREATEST to ensure value never drops below 0 safely
    await pool.query(
      "UPDATE mlas SET active_session_count = GREATEST(0, COALESCE(active_session_count, 0) - 1) WHERE id = $1",
      [req.user.id]
    );
  }

  res.cookie("jwt", "loggedout", getSessionCookieOptions(req, new Date(Date.now() + 5 * 1000)));

  res.status(200).json({
    status: "success",
    message: "Logged out successfully from cookie session."
  });
});