const db = require('../config/db');

const query = db.queryAsync;

const USER_ROLE_TABLE_CANDIDATES = ['userrole', 'userroles', 'user_role'];
let cachedUserRoleTable = null;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function validateUserRoleTableName(tableName) {
    if (!USER_ROLE_TABLE_CANDIDATES.includes(tableName)) {
        throw new Error('Ten bang user-role khong hop le.');
    }
    return tableName;
}

function parsePositiveInt(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

function normalizeUserRole(row) {
    if (!row) {
        return null;
    }

    return {
        userId: row.UserID,
        roleId: row.RoleID,
    };
}

async function findUserRoleTable() {
    const placeholders = USER_ROLE_TABLE_CANDIDATES.map(() => '?').join(', ');
    const rows = await query(
        `SELECT TABLE_NAME
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME IN (${placeholders})
         ORDER BY FIELD(TABLE_NAME, ${placeholders})
         LIMIT 1`,
        [...USER_ROLE_TABLE_CANDIDATES, ...USER_ROLE_TABLE_CANDIDATES]
    );

    return rows[0]?.TABLE_NAME || null;
}

async function createUserRoleTable() {
    await query(
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
}

async function resolveUserRoleTable({ createIfMissing = false } = {}) {
    if (cachedUserRoleTable) {
        return validateUserRoleTableName(cachedUserRoleTable);
    }

    let tableName = await findUserRoleTable();
    if (!tableName && createIfMissing) {
        await createUserRoleTable();
        tableName = 'userrole';
    }

    if (!tableName) {
        return null;
    }

    cachedUserRoleTable = validateUserRoleTableName(tableName);
    return cachedUserRoleTable;
}

exports.getAllUserRoles = async () => {
    const tableName = await resolveUserRoleTable({ createIfMissing: false });
    if (!tableName) {
        return [];
    }

    const rows = await query(`SELECT UserID, RoleID FROM ${tableName} ORDER BY UserID DESC, RoleID DESC`);
    return rows.map(normalizeUserRole);
};

exports.getUserRoleById = async (userId, roleId) => {
    const tableName = await resolveUserRoleTable({ createIfMissing: false });
    if (!tableName) {
        return null;
    }

    const rows = await query(
        `SELECT UserID, RoleID FROM ${tableName} WHERE UserID = ? AND RoleID = ? LIMIT 1`,
        [userId, roleId]
    );
    return rows.length ? normalizeUserRole(rows[0]) : null;
};

exports.createUserRole = async (payload = {}) => {
    const userId = parsePositiveInt(payload.userId ?? payload.UserID, 'userId');
    const roleId = parsePositiveInt(payload.roleId ?? payload.RoleID, 'roleId');
    const tableName = await resolveUserRoleTable({ createIfMissing: true });

    await query(`INSERT INTO ${tableName} (UserID, RoleID) VALUES (?, ?)`, [userId, roleId]);
    return exports.getUserRoleById(userId, roleId);
};

exports.updateUserRole = async (userId, roleId, payload = {}) => {
    const tableName = await resolveUserRoleTable({ createIfMissing: true });
    const existed = await exports.getUserRoleById(userId, roleId);
    if (!existed) {
        return null;
    }

    const newUserId = parsePositiveInt(payload.newUserID ?? payload.userId ?? payload.UserID, 'userId');
    const newRoleId = parsePositiveInt(payload.newRoleID ?? payload.roleId ?? payload.RoleID, 'roleId');

    await query(
        `UPDATE ${tableName} SET UserID = ?, RoleID = ? WHERE UserID = ? AND RoleID = ?`,
        [newUserId, newRoleId, userId, roleId]
    );

    return exports.getUserRoleById(newUserId, newRoleId);
};

exports.deleteUserRole = async (userId, roleId) => {
    const tableName = await resolveUserRoleTable({ createIfMissing: false });
    if (!tableName) {
        return 0;
    }

    const result = await query(`DELETE FROM ${tableName} WHERE UserID = ? AND RoleID = ?`, [userId, roleId]);
    return result.affectedRows;
};