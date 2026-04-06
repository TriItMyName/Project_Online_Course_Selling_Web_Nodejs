const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeRolePermission(row) {
    if (!row) {
        return null;
    }

    return {
        roleId: row.RoleID,
        permissionId: row.PermissionID,
    };
}

function parsePositiveInt(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

exports.getAllRolePermissions = async () => {
    const rows = await query('SELECT * FROM rolepermissions ORDER BY RoleID DESC, PermissionID DESC');
    return rows.map(normalizeRolePermission);
};

exports.getRolePermissionById = async (roleId, permissionId) => {
    const rows = await query(
        'SELECT * FROM rolepermissions WHERE RoleID = ? AND PermissionID = ? LIMIT 1',
        [roleId, permissionId]
    );
    return rows.length ? normalizeRolePermission(rows[0]) : null;
};

exports.createRolePermission = async (payload = {}) => {
    const roleId = parsePositiveInt(payload.roleId ?? payload.RoleID, 'roleId');
    const permissionId = parsePositiveInt(payload.permissionId ?? payload.PermissionID, 'permissionId');

    await query('INSERT INTO rolepermissions (RoleID, PermissionID) VALUES (?, ?)', [roleId, permissionId]);
    return exports.getRolePermissionById(roleId, permissionId);
};

exports.updateRolePermission = async (roleId, permissionId, payload = {}) => {
    const existed = await exports.getRolePermissionById(roleId, permissionId);
    if (!existed) {
        return null;
    }

    const newRoleId = parsePositiveInt(payload.newRoleID ?? payload.roleId ?? payload.RoleID, 'roleId');
    const newPermissionId = parsePositiveInt(payload.newPermissionID ?? payload.permissionId ?? payload.PermissionID, 'permissionId');

    await query(
        'UPDATE rolepermissions SET RoleID = ?, PermissionID = ? WHERE RoleID = ? AND PermissionID = ?',
        [newRoleId, newPermissionId, roleId, permissionId]
    );

    return exports.getRolePermissionById(newRoleId, newPermissionId);
};

exports.deleteRolePermission = async (roleId, permissionId) => {
    const result = await query('DELETE FROM rolepermissions WHERE RoleID = ? AND PermissionID = ?', [roleId, permissionId]);
    return result.affectedRows;
};