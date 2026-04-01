const db = require('../config/db'); // Kết nối cơ sở dữ liệu



// Lấy tất cả các user-role
exports.getAllUserRoles = (callback) => {
    db.query('SELECT * FROM userrole', (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results);
    });
};

// Lấy thông tin user-role theo UserID và RoleID
exports.getUserRoleById = (userId, roleId, callback) => {
    db.query('SELECT * FROM userrole WHERE UserID = ? AND RoleID = ?', [userId, roleId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        if (results.length === 0) {
            return callback(new Error('UserRole không tồn tại'), null);
        }
        callback(null, results[0]);
    });
};

// Tạo một user-role mới
exports.createUserRole = (userRoleData, callback) => {
    const { UserID, RoleID } = userRoleData;
    db.query('INSERT INTO userrole (UserID, RoleID) VALUES (?, ?)', [UserID, RoleID], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { UserID, RoleID });
    });
};

// Cập nhật thông tin user-role
exports.updateUserRole = (userId, roleId, userRoleData, callback) => {
    const { newUserID, newRoleID } = userRoleData;
    db.query(
        'UPDATE userrole SET UserID = ?, RoleID = ? WHERE UserID = ? AND RoleID = ?',
        [newUserID, newRoleID, userId, roleId],
        (err, results) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { UserID: newUserID, RoleID: newRoleID });
        }
    );
};

// Xóa một user-role
exports.deleteUserRole = (userId, roleId, callback) => {
    db.query('DELETE FROM userrole WHERE UserID = ? AND RoleID = ?', [userId, roleId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { message: 'UserRole đã được xóa thành công' });
    });
};