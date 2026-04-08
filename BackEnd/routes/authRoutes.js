const express = require('express');
const authController = require('../controllers/authController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/users/checklogin', authController.checkLogin);
router.get('/auth/users/non-admins/count', requireRole('Admin'), authController.countNonAdmins);

module.exports = router;