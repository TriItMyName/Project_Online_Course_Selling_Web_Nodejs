const rolePermissionModel = require('../schema/rolePermissionModel');

// Lấy tất cả các role-permission
exports.getAllRolePermissions = (req, res) => {
    rolePermissionModel.getAllRolePermissions((err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(results);
    });
};

// Lấy thông tin role-permission theo RoleID và PermissionID
exports.getRolePermissionById = (req, res) => {
    const { roleId, permissionId } = req.params;
    rolePermissionModel.getRolePermissionById(roleId, permissionId, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        if (!result) {
            return res.status(404).json({ message: 'RolePermission không tồn tại' });
        }
        res.json(result);
    });
};

// Tạo một role-permission mới
exports.createRolePermission = (req, res) => {
    const rolePermissionData = req.body;
    rolePermissionModel.createRolePermission(rolePermissionData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.status(201).json(result);
    });
};

// Cập nhật thông tin role-permission
exports.updateRolePermission = (req, res) => {
    const { roleId, permissionId } = req.params;
    const rolePermissionData = req.body;
    rolePermissionModel.updateRolePermission(roleId, permissionId, rolePermissionData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(result);
    });
};

// Xóa một role-permission
exports.deleteRolePermission = (req, res) => {
    const { roleId, permissionId } = req.params;
    rolePermissionModel.deleteRolePermission(roleId, permissionId, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(result);
    });
};