const express = require('express');
const router = express.Router();
const mlaController = require('../controllers/mlaController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/register', authorize('super_admin'), mlaController.registerMlaOrAdmin);
router.put('/:id/status', authorize('super_admin'), mlaController.updateAccountStatus);
router.get('/monitor', authorize('super_admin', 'admin'), mlaController.monitorActions);

module.exports = router;