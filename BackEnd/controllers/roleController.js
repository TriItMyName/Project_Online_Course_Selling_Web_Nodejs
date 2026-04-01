const usersModel = require('../schema/rolesModel');

const SECRET_KEY = "tri16102004"; // Định nghĩa SECRET_KEY

// Lấy tất cả vai trò
exports.getAllRoles = (req, res) => {
    usersModel.getAllRoles((err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(results);
    });
};

// Lấy thông tin vai trò theo ID
exports.getRoleById = (req, res) => {
    const roleId = req.params.id;
    usersModel.getRoleById(roleId, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        if (!result) {
            return res.status(404).json({ message: 'Vai trò không tồn tại' });
        }
        res.json(result);
    });
}

// Tạo vai trò mới
exports.createRole = (req, res) => {
    const roleData = req.body;
    usersModel.createRole(roleData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.status(201).json(result);
    });
}

// Cập nhật thông tin vai trò

exports.updateRole = (req, res) => {
    const roleId = req.params.id;
    const roleData = req.body;
    usersModel.updateRole(roleId, roleData, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(result);
    });
}

// Xóa vai trò
exports.deleteRole = (req, res) => {
    const roleId = req.params.id;
    usersModel.deleteRole(roleId, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Lỗi server', error: err });
        }
        res.json(result);
    });
}
