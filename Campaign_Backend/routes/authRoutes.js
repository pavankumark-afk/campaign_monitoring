const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

// SECURE RATE LIMITING KEY GENERATOR--------------------------

const getRateLimitKey = (req) => {
  // Use mobile number if it's explicitly passed in the request body
  const identifier = req.body?.mobileNumber || req.body?.data?.mobileNumber;
  if (identifier) return identifier;

  // Otherwise, safely fall back to the native IP tracking utility string
  return rateLimit.defaultIpKeyGenerator(req);
};

// Strict policy for requesting OTPs (Limits SMS spam)
const otpRequestLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2-minute cooldown window
  max: 3, // Target mobile identifier can only receive 3 messages per window
  keyGenerator: getRateLimitKey, 
  message: {
    status: "fail",
    message: "Too many OTP generation requests for this device. Please wait 2 minutes.",
  },
  standardHeaders: true, 
  legacyHeaders: false,
  // Using the exact property name requested by the package's validation config engine
  validate: { keyGeneratorIpFallback: false }, 
});

// Strict check policy for incorrect verification attempts (Stops guessing attacks)
const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5-minute freeze window
  max: 5, // Maximum 5 entry validation checks allowed before locking target out
  keyGenerator: getRateLimitKey,
  message: {
    status: "fail",
    message: "Too many incorrect validation login responses logged. Access suspended for 5 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Using the exact property name requested by the package's validation config engine
  validate: { keyGeneratorIpFallback: false }, 
});

// Public endpoints----------------------------------------------------
router.post("/request-otp", otpRequestLimiter, authController.requestOTP);           //http://localhost:3000/api/auth/request-otp
router.post("/verify-otp", otpVerifyLimiter, authController.verifyOTP);            //http://localhost:3000/api/auth/verify-otp
router.post("/logout",protect, authController.logout);                                 //http://localhost:3000/api/auth/logout

module.exports = router;