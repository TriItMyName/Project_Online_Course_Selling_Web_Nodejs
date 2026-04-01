const db = require('../config/db');

// Lấy tất cả các role-permission
exports.getAllRolePermissions = (callback) => {
    db.query('SELECT * FROM rolepermissions', (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results);
    });
};

// Lấy thông tin role-permission theo RoleID và PermissionID
exports.getRolePermissionById = (roleId, permissionId, callback) => {
    db.query(
        'SELECT * FROM rolepermissions WHERE RoleID = ? AND PermissionID = ?',
        [roleId, permissionId],
        (err, results) => {
            if (err) {
                return callback(err, null);
            }
            if (results.length === 0) {
                return callback(new Error('RolePermission không tồn tại'), null);
            }
            callback(null, results[0]);
        }
    );
};

// Tạo một role-permission mới
exports.createRolePermission = (rolePermissionData, callback) => {
    const { RoleID, PermissionID } = rolePermissionData;
    db.query(
        'INSERT INTO rolepermissions (RoleID, PermissionID) VALUES (?, ?)',
        [RoleID, PermissionID],
        (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { RoleID, PermissionID });
        }
    );
};

// Cập nhật thông tin role-permission
exports.updateRolePermission = (roleId, permissionId, rolePermissionData, callback) => {
    const { newRoleID, newPermissionID } = rolePermissionData;
    db.query(
        'UPDATE rolepermissions SET RoleID = ?, PermissionID = ? WHERE RoleID = ? AND PermissionID = ?',
        [newRoleID, newPermissionID, roleId, permissionId],
        (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { RoleID: newRoleID, PermissionID: newPermissionID });
        }
    );
};

// Xóa một role-permission
exports.deleteRolePermission = (roleId, permissionId, callback) => {
    db.query(
        'DELETE FROM rolepermissions WHERE RoleID = ? AND PermissionID = ?',
        [roleId, permissionId],
        (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { message: 'RolePermission đã được xóa thành công' });
        }
    );
};