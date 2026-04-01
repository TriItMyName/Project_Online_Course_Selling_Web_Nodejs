const db = require('../config/db'); // Kết nối cơ sở dữ liệu

// Lấy tất cả vai trò
exports.getAllRoles = (callback) => {
    db.query('SELECT * FROM roles', (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results);
    });
}

// Lấy thông tin vai trò theo ID
exports.getRoleById = (roleId, callback) => {
    db.query('SELECT * FROM roles WHERE RoleID = ?', [roleId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        if (results.length === 0) {
            return callback(new Error('Role not found'), null);
        }
        callback(null, results[0]);
    });
}

// Tạo vai trò mới
exports.createRole = (roleData, callback) => {
    const { RoleName } = roleData;
    db.query('INSERT INTO roles (RoleName) VALUES (?)', [RoleName], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { RoleID: results.insertId, RoleName });
    });
}

// Cập nhật thông tin vai trò
exports.updateRole = (roleId, roleData, callback) => {
    const { RoleName } = roleData;
    db.query('UPDATE roles SET RoleName = ? WHERE RoleID = ?', [RoleName, roleId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { RoleID: results.insertId, RoleName });
    });
}

// Xóa vai trò
exports.deleteRole = (roleId, callback) => {
    db.query('DELETE FROM roles WHERE RoleID = ?', [roleId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { message: 'Role deleted successfully' });
    });
}
