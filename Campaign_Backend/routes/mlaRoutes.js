const express = require('express');
const router = express.Router();
const mlaController = require('../controllers/mlaController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.post('/register', authenticate, authorize('super_admin'), mlaController.registerMlaOrAdmin);
router.put('/:id/status', authenticate, authorize('super_admin'), mlaController.updateAccountStatus);
router.get('/monitor', authenticate, authorize('super_admin', 'admin'), mlaController.monitorActions);

module.exports = router;