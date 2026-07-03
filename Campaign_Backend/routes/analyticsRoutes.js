const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/userAnalyticsController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { useCache } = require('../middlewares/cacheMiddleware');

// Fetch nested dashboard analytics layout (Cached for 2 minutes)
router.get(
  '/user-logins', 
  authenticate, 
  authorize('super_admin'), 
  useCache(60), 
  analyticsController.getLoginAndActivityMetrics
);

// Fetch scoped dashboard analytics for the logged-in MLA (Cached for 1 minute)
router.get(
  '/mla/user-logins', 
  authenticate, 
  authorize('mla'), 
  useCache(60), 
  analyticsController.getMlaLoginAndActivityMetrics
);

module.exports = router;