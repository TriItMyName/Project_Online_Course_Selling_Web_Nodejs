const userRoleModel = require('../schema/userroleModel');


// Lấy tất cả các user-role
exports.getAllUserRoles = (req, res) => {
    userRoleModel.getAllUserRoles((err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(results);
    });
};

// Lấy thông tin user-role theo UserID và RoleID
exports.getUserRoleById = (req, res) => {
    const { userId, roleId } = req.params;
    userRoleModel.getUserRoleById(userId, roleId, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        if (!result) {
            return res.status(404).json({ message: 'UserRole không tồn tại' });
        }
        res.json(result);
    });
};

// Tạo một user-role mới
exports.createUserRole = (req, res) => {
    const userRoleData = req.body;
    userRoleModel.createUserRole(userRoleData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.status(201).json(result);
    });
};

// Cập nhật thông tin user-role
exports.updateUserRole = (req, res) => {
    const { userId, roleId } = req.params;
    const userRoleData = req.body;
    userRoleModel.updateUserRole(userId, roleId, userRoleData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(result);
    });
};

// Xóa một user-role
exports.deleteUserRole = (req, res) => {
    const { userId, roleId } = req.params;
    userRoleModel.deleteUserRole(userId, roleId, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(result);
    });
};