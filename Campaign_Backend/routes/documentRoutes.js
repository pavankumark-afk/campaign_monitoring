const express = require('express');
const router = express.Router();
const docController = require('../controllers/documentController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { useCache } = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../utils/cache');

router.use(protect);

// REPLACED: Using memory buffer stream middleware directly from the controller 
// instead of the old local disk storage middleware.
router.post(
  '/upload', 
  authorize('super_admin'), 
  docController.uploadMiddleware, (req, res, next) => {
  clearCachePattern('__express__/api/documents');
  next();
}, docController.uploadAndDistribute
);

//NEW: Delete route to purge documents from both Firebase and PostgreSQL
router.delete(
  '/:docId', 
  authorize('super_admin'),(req, res, next) => {
  clearCachePattern('__express__/api/documents');
  next();
}, docController.deleteDocument
);

router.get('/list', protect, useCache(600), docController.getAvailableDocuments);
router.get('/:docId/download', protect, docController.downloadDocument);
router.get('/metrics', protect, authorize('super_admin'),useCache(600), docController.getDocumentDetailedMetrics);

module.exports = router;