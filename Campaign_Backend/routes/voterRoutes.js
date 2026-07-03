const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { useCache } = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../utils/cache');

router.use(protect);

// Hierarchical PC -> AC nested analytics dashboard endpoint
router.get(
  '/metrics/hierarchical', 
    authorize('super_admin', 'admin'),useCache(1800),   // 10 minutes cache
    voterController.getNestedCampaignMetrics
);

// GET /api/voters/metrics/my-constituency
router.get(
  '/metrics/my-constituency',
  authorize('mla'), useCache(300),   // 5 minutes cache
  voterController.getMlaSelfAcMetrics
);

module.exports = router;    