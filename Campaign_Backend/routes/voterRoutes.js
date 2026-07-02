const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { useCache } = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../utils/cache');

// Hierarchical PC -> AC nested analytics dashboard endpoint
router.get(
  '/metrics/hierarchical', 
    authenticate,
    authorize('super_admin', 'admin'),useCache(1800),   // 10 minutes cache
    voterController.getNestedCampaignMetrics
);

// GET /api/voters/metrics/my-constituency
router.get(
  '/metrics/my-constituency', 
  authenticate, 
  authorize('mla'), useCache(60),   // 1 minutes cache
  voterController.getMlaSelfAcMetrics
);

module.exports = router;    