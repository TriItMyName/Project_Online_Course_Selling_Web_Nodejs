const express = require('express');
const userRoleController = require('../controllers/userroleController');

const router = express.Router();

// Route để lấy danh sách tất cả các user-role
router.get('/userroles', userRoleController.getAllUserRoles);

// Route để lấy thông tin user-role theo UserID và RoleID
router.get('/userroles/:userId/:roleId', userRoleController.getUserRoleById);

// Route để tạo một user-role mới
router.post('/userroles', userRoleController.createUserRole);

// Route để cập nhật thông tin user-role
router.put('/userroles/:userId/:roleId', userRoleController.updateUserRole);

// Route để xóa một user-role
router.delete('/userroles/:userId/:roleId', userRoleController.deleteUserRole);

module.exports = router;