const bcrypt = require('bcryptjs');
const db = require('../config/db');
const query = db.queryAsync;
const withTransaction = db.withTransaction;

function normalizeUser(row) {
    return {
        id: row.UserID,
        username: row.UserName,
        email: row.Email,
        status: row.Status,
        createTime: row.CreateTime,
        role: row.RoleName || 'Student',
    };
}

exports.getAllUsers = async (_req, res, next) => {
    try {
        const rows = await query(
            `SELECT u.UserID, u.UserName, u.Email, u.Status, u.CreateTime, r.RoleName
             FROM users u
             LEFT JOIN userrole ur ON ur.UserID = u.UserID
             LEFT JOIN roles r ON r.RoleID = ur.RoleID
             ORDER BY u.UserID DESC`
        );
        return res.json(rows.map(normalizeUser));
    } catch (error) {
        return next(error);
    }
};

exports.getUserById = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const rows = await query(
            `SELECT u.UserID, u.UserName, u.Email, u.Status, u.CreateTime, r.RoleName
             FROM users u
             LEFT JOIN userrole ur ON ur.UserID = u.UserID
             LEFT JOIN roles r ON r.RoleID = ur.RoleID
             WHERE u.UserID = ?
             LIMIT 1`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'User khong ton tai.' });
        }

        return res.json(normalizeUser(rows[0]));
    } catch (error) {
        return next(error);
    }
};

exports.createUser = async (req, res, next) => {
    try {
        const username = String(req.body.username || req.body.UserName || '').trim();
        const email = String(req.body.email || req.body.Email || '').trim().toLowerCase();
        const password = String(req.body.password || req.body.Password || '123456').trim();
        const status = String(req.body.status || req.body.Status || 'Hoat dong').trim();
        const roleName = String(req.body.role || req.body.RoleName || 'Student').trim();

        if (!username || !email) {
            return res.status(400).json({ message: 'username va email la bat buoc.' });
        }

        const existed = await query('SELECT UserID FROM users WHERE Email = ? LIMIT 1', [email]);
        if (existed.length) {
            return res.status(409).json({ message: 'Email da ton tai.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await withTransaction(async (conn) => {
            const [insertUser] = await conn.query(
                'INSERT INTO users (UserName, Email, Password, Status, CreateTime) VALUES (?, ?, ?, ?, NOW())',
                [username, email, hashedPassword, status]
            );

            let [roles] = await conn.query('SELECT RoleID FROM roles WHERE RoleName = ? LIMIT 1', [roleName]);
            let roleId = roles[0]?.RoleID;
            if (!roleId) {
                const [insertRole] = await conn.query('INSERT INTO roles (RoleName) VALUES (?)', [roleName]);
                roleId = insertRole.insertId;
            }

            await conn.query('INSERT INTO userrole (UserID, RoleID) VALUES (?, ?)', [insertUser.insertId, roleId]);
            return {
                id: insertUser.insertId,
                username,
                email,
                status,
                role: roleName,
            };
        });

        return res.status(201).json(user);
    } catch (error) {
        return next(error);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const username = req.body.username || req.body.UserName;
        const email = req.body.email || req.body.Email;
        const password = req.body.password || req.body.Password;
        const status = req.body.status || req.body.Status;

        const updates = [];
        const params = [];

        if (username != null) {
            updates.push('UserName = ?');
            params.push(String(username).trim());
        }
        if (email != null) {
            updates.push('Email = ?');
            params.push(String(email).trim().toLowerCase());
        }
        if (password != null && String(password).trim()) {
            updates.push('Password = ?');
            params.push(await bcrypt.hash(String(password).trim(), 10));
        }
        if (status != null) {
            updates.push('Status = ?');
            params.push(String(status).trim());
        }

        if (!updates.length) {
            return res.status(400).json({ message: 'Khong co du lieu de cap nhat.' });
        }

        params.push(id);
        await query(`UPDATE users SET ${updates.join(', ')} WHERE UserID = ?`, params);

        return res.json({ message: 'Cap nhat user thanh cong.' });
    } catch (error) {
        return next(error);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        await withTransaction(async (conn) => {
            await conn.query('DELETE FROM userrole WHERE UserID = ?', [id]);
            await conn.query('DELETE FROM users WHERE UserID = ?', [id]);
        });
        return res.json({ message: 'Xoa user thanh cong.' });
    } catch (error) {
        return next(error);
    }
};