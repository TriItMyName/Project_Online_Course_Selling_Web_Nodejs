const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/auth/register', authController.register);
router.post('/auth/users/checklogin', authController.checkLogin);
router.get('/auth/users/non-admins/count', authController.countNonAdmins);

module.exports = router;