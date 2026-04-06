const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeRole(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.RoleID,
        roleName: row.RoleName,
    };
}

exports.getAllRoles = async () => {
    const rows = await query('SELECT * FROM roles ORDER BY RoleID DESC');
    return rows.map(normalizeRole);
};

exports.getRoleById = async (id) => {
    const rows = await query('SELECT * FROM roles WHERE RoleID = ? LIMIT 1', [id]);
    return rows.length ? normalizeRole(rows[0]) : null;
};

exports.createRole = async (payload = {}) => {
    const roleName = String(payload.roleName ?? payload.RoleName ?? '').trim();
    if (!roleName) {
        throw toHttpError(400, 'roleName la bat buoc.');
    }

    const result = await query('INSERT INTO roles (RoleName) VALUES (?)', [roleName]);
    return exports.getRoleById(result.insertId);
};

exports.updateRole = async (id, payload = {}) => {
    const safeId = Number(id);
    const existed = await exports.getRoleById(safeId);
    if (!existed) {
        return null;
    }

    const roleName = String(payload.roleName ?? payload.RoleName ?? '').trim();
    if (!roleName) {
        throw toHttpError(400, 'roleName khong duoc de trong.');
    }

    await query('UPDATE roles SET RoleName = ? WHERE RoleID = ?', [roleName, safeId]);
    return exports.getRoleById(safeId);
};

exports.deleteRole = async (id) => {
    const result = await query('DELETE FROM roles WHERE RoleID = ?', [id]);
    return result.affectedRows;
};
