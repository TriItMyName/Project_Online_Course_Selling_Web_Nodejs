const express = require('express');
const rolePermissionController = require('../controllers/rolePermissionController');

const router = express.Router();

// Route để lấy danh sách tất cả các role-permissions
router.get('/rolepermissions', rolePermissionController.getAllRolePermissions);

// Route để lấy thông tin role-permission theo RoleID và PermissionID
router.get('/rolepermissions/:roleId/:permissionId', rolePermissionController.getRolePermissionById);

// Route để tạo một role-permission mới
router.post('/rolepermissions', rolePermissionController.createRolePermission);

// Route để cập nhật thông tin role-permission
router.put('/rolepermissions/:roleId/:permissionId', rolePermissionController.updateRolePermission);

// Route để xóa một role-permission
router.delete('/rolepermissions/:roleId/:permissionId', rolePermissionController.deleteRolePermission);

module.exports = router;