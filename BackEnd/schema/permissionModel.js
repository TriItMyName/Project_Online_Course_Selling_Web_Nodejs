const db = require('../config/db');

// Lấy tất cả các permissions
exports.getAllPermissions = (callback) => {
    db.query('SELECT * FROM permissions', (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results);
    });
};

// Lấy thông tin permission theo ID
exports.getPermissionById = (permissionId, callback) => {
    db.query('SELECT * FROM permissions WHERE PermissionID = ?', [permissionId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        if (results.length === 0) {
            return callback(new Error('Permission không tồn tại'), null);
        }
        callback(null, results[0]);
    });
};

// Tạo một permission mới
exports.createPermission = (permissionData, callback) => {
    const { PermissionName, Description } = permissionData;
    db.query(
        'INSERT INTO permissions (PermissionName, Description) VALUES (?, ?)',
        [PermissionName, Description],
        (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { PermissionID: results.insertId, PermissionName, Description });
        }
    );
};

// Cập nhật thông tin permission
exports.updatePermission = (permissionId, permissionData, callback) => {
    const { PermissionName, Description } = permissionData;
    db.query(
        'UPDATE permissions SET PermissionName = ?, Description = ? WHERE PermissionID = ?',
        [PermissionName, Description, permissionId],
        (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { PermissionID: permissionId, PermissionName, Description });
        }
    );
};

// Xóa một permission
exports.deletePermission = (permissionId, callback) => {
    db.query('DELETE FROM permissions WHERE PermissionID = ?', [permissionId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { message: 'Permission đã được xóa thành công' });
    });
};