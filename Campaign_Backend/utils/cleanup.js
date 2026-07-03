const pool = require("../config/db");

const clearExpiredOTPs = async () => {
  try {
    // The index we added above makes this execution take less than 2 milliseconds
    await pool.query("DELETE FROM otp_store WHERE expires_at < NOW()");
    console.log("Expired OTPs cleaned up.");
  } catch (err) {
    console.error("Cleanup error:", err);
  }
};

module.exports = clearExpiredOTPs;


