const express = require('express');
const router = express.Router();
const docController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { useCache } = require('../middlewares/cacheMiddleware');
const { clearCachePattern } = require('../utils/cache');

// REPLACED: Using memory buffer stream middleware directly from the controller 
// instead of the old local disk storage middleware.
router.post(
  '/upload', 
  authenticate, 
  authorize('super_admin'), 
  docController.uploadMiddleware, (req, res, next) => {
  clearCachePattern('__express__/api/documents');
  next();
}, docController.uploadAndDistribute
);

//NEW: Delete route to purge documents from both Firebase and PostgreSQL
router.delete(
  '/:docId', 
  authenticate, 
  authorize('super_admin'),(req, res, next) => {
  clearCachePattern('__express__/api/documents');
  next();
}, docController.deleteDocument
);

router.get('/list', authenticate, useCache(600), docController.getAvailableDocuments);
router.get('/:docId/download', authenticate, docController.downloadDocument);
router.get('/metrics', authenticate, authorize('super_admin'),useCache(600), docController.getDocumentDetailedMetrics);

module.exports = router;