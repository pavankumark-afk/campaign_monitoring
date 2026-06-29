const express = require('express');
const router = express.Router();
const docController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// REPLACED: Using memory buffer stream middleware directly from the controller 
// instead of the old local disk storage middleware.
router.post(
  '/upload', 
  authenticate, 
  authorize('super_admin'), 
  docController.uploadMiddleware, 
  docController.uploadAndDistribute
);

//NEW: Delete route to purge documents from both Firebase and PostgreSQL
router.delete(
  '/:docId', 
  authenticate, 
  authorize('super_admin'), 
  docController.deleteDocument
);

router.get('/list', authenticate, docController.getAvailableDocuments);
router.get('/:docId/download', authenticate, docController.downloadDocument);
router.get('/metrics', authenticate, authorize('super_admin'), docController.getDocumentDetailedMetrics);

module.exports = router;