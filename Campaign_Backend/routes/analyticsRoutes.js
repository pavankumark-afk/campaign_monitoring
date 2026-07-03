const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/userAnalyticsController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { useCache } = require('../middlewares/cacheMiddleware');

router.use(protect);

// Fetch nested dashboard analytics layout (Cached for 2 minutes)
router.get(
  '/user-logins', 
  authorize('super_admin'), 
  useCache(300), 
  analyticsController.getLoginAndActivityMetrics
);

// Fetch scoped dashboard analytics for the logged-in MLA (Cached for 1 minute)
router.get(
  '/mla/user-logins', 
  authorize('mla'), 
  useCache(300), 
  analyticsController.getMlaLoginAndActivityMetrics
);

module.exports = router;