const bcrypt = require('bcryptjs');
const db = require('../config/db');

const query = db.queryAsync;
const withTransaction = db.withTransaction;

const USER_ROLE_TABLE_CANDIDATES = ['userrole', 'userroles', 'user_role'];
let cachedUserRoleTable = null;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeUser(row) {
    if (!row) {
        return null;
    }
    return {
        id: row.UserID,
        username: row.UserName,
        email: row.Email,
        status: row.Status,
        createTime: row.CreateTime,
        role: row.RoleName || 'Student',
    };
}

function validateUserRoleTableName(tableName) {
    if (!USER_ROLE_TABLE_CANDIDATES.includes(tableName)) {
        throw new Error('Ten bang user-role khong hop le.');
    }
    return tableName;
}

async function execRows(sql, params = [], conn = null) {
    if (conn) {
        const [rows] = await conn.query(sql, params);
        return rows;
    }
    return query(sql, params);
}

async function findUserRoleTable(conn = null) {
    const placeholders = USER_ROLE_TABLE_CANDIDATES.map(() => '?').join(', ');
    const rows = await execRows(
        `SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME IN (${placeholders})
         ORDER BY FIELD(TABLE_NAME, ${placeholders})
         LIMIT 1`,
        [...USER_ROLE_TABLE_CANDIDATES, ...USER_ROLE_TABLE_CANDIDATES],
        conn
    );

    return rows[0]?.TABLE_NAME || null;
}

async function createUserRoleTable(conn = null) {
    await execRows(
        `CREATE TABLE IF NOT EXISTS userrole (
          UserID INT NOT NULL,
          RoleID INT NOT NULL,
          PRIMARY KEY (UserID, RoleID),
          KEY idx_userrole_roleid (RoleID),
          CONSTRAINT fk_userrole_user FOREIGN KEY (UserID) REFERENCES users(UserID)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
          CONSTRAINT fk_userrole_role FOREIGN KEY (RoleID) REFERENCES roles(RoleID)
            ON UPDATE CASCADE
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        [],
        conn
    );
}

async function resolveUserRoleTable(conn = null, { createIfMissing = false } = {}) {
    if (cachedUserRoleTable) {
        return validateUserRoleTableName(cachedUserRoleTable);
    }

    let tableName = await findUserRoleTable(conn);
    if (!tableName && createIfMissing) {
        await createUserRoleTable(conn);
        tableName = 'userrole';
    }

    if (!tableName) {
        return null;
    }

    cachedUserRoleTable = validateUserRoleTableName(tableName);
    return cachedUserRoleTable;
}

async function ensureRoleId(conn, roleName) {
    const [roles] = await conn.query('SELECT RoleID FROM roles WHERE RoleName = ? LIMIT 1', [roleName]);
    let roleId = roles[0]?.RoleID;

    if (!roleId) {
        const [insertRole] = await conn.query('INSERT INTO roles (RoleName) VALUES (?)', [roleName]);
        roleId = insertRole.insertId;
    }

    return roleId;
}

exports.getAllUsers = async () => {
    const userRoleTable = await resolveUserRoleTable(null, { createIfMissing: false });
    const rows = userRoleTable
        ? await query(
            `SELECT u.UserID, u.UserName, u.Email, u.Status, u.CreateTime, r.RoleName
             FROM users u
             LEFT JOIN ${userRoleTable} ur ON ur.UserID = u.UserID
             LEFT JOIN roles r ON r.RoleID = ur.RoleID
             ORDER BY u.UserID DESC`
        )
        : await query(
            `SELECT u.UserID, u.UserName, u.Email, u.Status, u.CreateTime, NULL AS RoleName
             FROM users u
             ORDER BY u.UserID DESC`
        );

    return rows.map(normalizeUser);
};

exports.getUserById = async (id) => {
    const userRoleTable = await resolveUserRoleTable(null, { createIfMissing: false });
    const rows = userRoleTable
        ? await query(
            `SELECT u.UserID, u.UserName, u.Email, u.Status, u.CreateTime, r.RoleName
             FROM users u
             LEFT JOIN ${userRoleTable} ur ON ur.UserID = u.UserID
             LEFT JOIN roles r ON r.RoleID = ur.RoleID
             WHERE u.UserID = ?
             LIMIT 1`,
            [id]
        )
        : await query(
            `SELECT u.UserID, u.UserName, u.Email, u.Status, u.CreateTime, NULL AS RoleName
             FROM users u
             WHERE u.UserID = ?
             LIMIT 1`,
            [id]
        );

    return rows.length ? normalizeUser(rows[0]) : null;
};

exports.findUserByEmail = async (email, excludeUserId = null) => {
    const sql = excludeUserId == null
        ? 'SELECT UserID FROM users WHERE Email = ? LIMIT 1'
        : 'SELECT UserID FROM users WHERE Email = ? AND UserID <> ? LIMIT 1';

    const params = excludeUserId == null ? [email] : [email, excludeUserId];
    const rows = await query(sql, params);
    return rows[0] || null;
};

exports.createUser = async ({ username, email, password, status = 'Hoat dong', roleName = 'Student' }) => {
    const safeUsername = String(username || '').trim();
    const safeEmail = String(email || '').trim().toLowerCase();
    const safePassword = String(password || '').trim();
    const safeStatus = String(status || '').trim() || 'Hoat dong';
    const safeRoleName = String(roleName || '').trim() || 'Student';

    if (!safeUsername || !safeEmail || !safePassword) {
        throw toHttpError(400, 'username, email, password la bat buoc.');
    }

    const duplicated = await exports.findUserByEmail(safeEmail);
    if (duplicated) {
        throw toHttpError(409, 'Email da ton tai.');
    }

    const hashedPassword = await bcrypt.hash(safePassword, 10);

    const createdUser = await withTransaction(async (conn) => {
        const userRoleTable = await resolveUserRoleTable(conn, { createIfMissing: true });

        const [insertUser] = await conn.query(
            'INSERT INTO users (UserName, Email, Password, Status, CreateTime) VALUES (?, ?, ?, ?, NOW())',
            [safeUsername, safeEmail, hashedPassword, safeStatus]
        );

        const roleId = await ensureRoleId(conn, safeRoleName);
        await conn.query(`INSERT INTO ${userRoleTable} (UserID, RoleID) VALUES (?, ?)`, [insertUser.insertId, roleId]);

        return {
            id: insertUser.insertId,
            username: safeUsername,
            email: safeEmail,
            status: safeStatus,
            role: safeRoleName,
        };
    });

    return createdUser;
};

exports.updateUser = async (id, { username, email, password, status, roleName }) => {
    const safeId = Number(id);
    const updates = [];
    const params = [];

    if (username != null) {
        updates.push('UserName = ?');
        params.push(String(username).trim());
    }

    if (email != null) {
        const safeEmail = String(email).trim().toLowerCase();
        const duplicated = await exports.findUserByEmail(safeEmail, safeId);
        if (duplicated) {
            throw toHttpError(409, 'Email da ton tai.');
        }
        updates.push('Email = ?');
        params.push(safeEmail);
    }

    if (password != null) {
        const safePassword = String(password).trim();
        const hashedPassword = await bcrypt.hash(safePassword, 10);
        updates.push('Password = ?');
        params.push(hashedPassword);
    }

    if (status != null) {
        updates.push('Status = ?');
        params.push(String(status).trim());
    }

    const safeRoleName = roleName != null ? String(roleName).trim() : undefined;
    if (safeRoleName === '') {
        throw toHttpError(400, 'role khong duoc de trong.');
    }

    if (!updates.length && safeRoleName === undefined) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    const isUpdated = await withTransaction(async (conn) => {
        const [existedRows] = await conn.query('SELECT UserID FROM users WHERE UserID = ? LIMIT 1', [safeId]);
        if (!existedRows.length) {
            return false;
        }

        if (updates.length) {
            params.push(safeId);
            await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE UserID = ?`, params);
        }

        if (safeRoleName !== undefined) {
            const userRoleTable = await resolveUserRoleTable(conn, { createIfMissing: true });
            const roleId = await ensureRoleId(conn, safeRoleName);
            await conn.query(`DELETE FROM ${userRoleTable} WHERE UserID = ?`, [safeId]);
            await conn.query(`INSERT INTO ${userRoleTable} (UserID, RoleID) VALUES (?, ?)`, [safeId, roleId]);
        }

        return true;
    });

    if (!isUpdated) {
        return null;
    }

    return exports.getUserById(safeId);
};

exports.deleteUser = async (id) => {
    const safeId = Number(id);

    const deletedCount = await withTransaction(async (conn) => {
        const userRoleTable = await resolveUserRoleTable(conn, { createIfMissing: false });
        if (userRoleTable) {
            await conn.query(`DELETE FROM ${userRoleTable} WHERE UserID = ?`, [safeId]);
        }
        const [result] = await conn.query('DELETE FROM users WHERE UserID = ?', [safeId]);
        return result.affectedRows;
    });

    return deletedCount;
};



