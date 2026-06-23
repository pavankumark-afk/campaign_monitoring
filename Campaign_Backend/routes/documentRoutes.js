const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const docController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.post('/upload', authenticate, authorize('super_admin'), upload.single('file'), docController.uploadAndDistribute);
router.get('/:docId/download', authenticate, docController.downloadDocument);
router.get('/metrics', authenticate, authorize('super_admin'), docController.getDocumentDetailedMetrics);

module.exports = router;