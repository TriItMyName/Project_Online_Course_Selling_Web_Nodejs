const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizePermission(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.PermissionID,
        permissionName: row.PermissionName,
        description: row.Description,
    };
}

exports.getAllPermissions = async () => {
    const rows = await query('SELECT * FROM permissions ORDER BY PermissionID DESC');
    return rows.map(normalizePermission);
};

exports.getPermissionById = async (id) => {
    const rows = await query('SELECT * FROM permissions WHERE PermissionID = ? LIMIT 1', [id]);
    return rows.length ? normalizePermission(rows[0]) : null;
};

exports.createPermission = async (payload = {}) => {
    const permissionName = String(payload.permissionName ?? payload.PermissionName ?? '').trim();
    const description = String(payload.description ?? payload.Description ?? '').trim();

    if (!permissionName) {
        throw toHttpError(400, 'permissionName la bat buoc.');
    }

    const result = await query(
        'INSERT INTO permissions (PermissionName, Description) VALUES (?, ?)',
        [permissionName, description]
    );

    return exports.getPermissionById(result.insertId);
};

exports.updatePermission = async (id, payload = {}) => {
    const safeId = Number(id);
    const existed = await exports.getPermissionById(safeId);
    if (!existed) {
        return null;
    }

    const updates = [];
    const params = [];

    if (payload.permissionName != null || payload.PermissionName != null) {
        const permissionName = String(payload.permissionName ?? payload.PermissionName ?? '').trim();
        if (!permissionName) {
            throw toHttpError(400, 'permissionName khong duoc de trong.');
        }
        updates.push('PermissionName = ?');
        params.push(permissionName);
    }

    if (payload.description != null || payload.Description != null) {
        const description = String(payload.description ?? payload.Description ?? '').trim();
        updates.push('Description = ?');
        params.push(description);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    params.push(safeId);
    await query(`UPDATE permissions SET ${updates.join(', ')} WHERE PermissionID = ?`, params);
    return exports.getPermissionById(safeId);
};

exports.deletePermission = async (id) => {
    const result = await query('DELETE FROM permissions WHERE PermissionID = ?', [id]);
    return result.affectedRows;
};