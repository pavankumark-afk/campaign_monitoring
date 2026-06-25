const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Hierarchical PC -> AC nested analytics dashboard endpoint
router.get(
  '/metrics/hierarchical', 
    authenticate,
    authorize('super_admin', 'admin'),
    voterController.getNestedCampaignMetrics
);

// GET /api/voters/metrics/my-constituency
router.get(
  '/metrics/my-constituency', 
  authenticate, 
  authorize('mla'), 
  voterController.getMlaSelfAcMetrics
);

module.exports = router;    