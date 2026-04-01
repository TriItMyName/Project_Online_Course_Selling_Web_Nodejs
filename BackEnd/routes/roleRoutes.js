const express = require('express');
const roleController = require('../controllers/roleController');

const router = express.Router();

// Route để lấy danh sách tất cả các role
router.get('/roles', roleController.getAllRoles);

// Route để lấy thông tin role theo ID
router.get('/roles/:id', roleController.getRoleById);

// Route để tạo một role mới
router.post('/roles', roleController.createRole);

// Route để cập nhật thông tin role
router.put('/roles/:id', roleController.updateRole);

// Route để xóa một role
router.delete('/roles/:id', roleController.deleteRole);

module.exports = router;


