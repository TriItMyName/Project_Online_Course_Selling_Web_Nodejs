const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Lấy tất cả người dùng
exports.getAllUsers = (callback) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, results);
    });
};

// Lấy thông tin người dùng theo ID
exports.getUserById = (userId, callback) => {
    db.query('SELECT * FROM users WHERE UserID = ?', [userId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        if (results.length === 0) {
            return callback(new Error('User not found'), null);
        }
        callback(null, results[0]);
    });
};

// Tạo một người dùng mới
exports.createUser = (userData, callback) => {
    const { UserName, Email, Password, Status } = userData;

    // Kiểm tra nếu password không tồn tại
    if (!Password) {
        return callback(new Error('Password is required'), null);
    }

    try {
        const hashedPassword = bcrypt.hashSync(Password, 8); // Mã hóa mật khẩu
        db.query(
            'INSERT INTO users (UserName, Email, Password, Status, CreateTime) VALUES (?, ?, ?, ?, NOW())',
            [UserName, Email, hashedPassword, Status || 'Hoạt động'],
            (err, results) => {
                if (err) {
                    return callback(err, null);
                }
                callback(null, { UserID: results.insertId, UserName, Email, Status });
            }
        );
    } catch (error) {
        callback(error, null); // Truyền lỗi lên controller
    }
};

// Cập nhật thông tin người dùng
exports.updateUser = (userId, userData, callback) => {
    const { UserName, Email, Password, Status } = userData;

    // Mã hóa mật khẩu nếu có
    const hashedPassword = Password ? bcrypt.hashSync(Password, 8) : null;

    // Xây dựng câu lệnh SQL động
    const fields = [];
    const values = [];

    if (UserName) {
        fields.push('UserName = ?');
        values.push(UserName);
    }
    if (Email) {
        fields.push('Email = ?');
        values.push(Email);
    }
    if (hashedPassword) {
        fields.push('Password = ?');
        values.push(hashedPassword);
    }
    if (Status) {
        fields.push('Status = ?');
        values.push(Status);
    }

    values.push(userId);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE UserID = ?`;

    db.query(query, values, (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { UserID: userId, UserName, Email, Status });
    });
};

// Xóa một người dùng
exports.deleteUser = (userId, callback) => {
    db.query('DELETE FROM users WHERE UserID = ?', [userId], (err, results) => {
        if (err) {
            return callback(err, null);
        }
        callback(null, { message: 'User deleted successfully' });
    });
};



