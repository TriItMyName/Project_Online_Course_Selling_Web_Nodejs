const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeCategory(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.CategoryID,
        categoryName: row.CategoryName,
        parentCategoryID: row.ParentID,
    };
}

function parseParentCategoryId(value) {
    if (value == null || String(value).trim() === '') {
        return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, 'parentCategoryID khong hop le.');
    }

    return parsed;
}

exports.getAllCategories = async () => {
    const rows = await query(
        `SELECT CategoryID, CategoryName, ParentID
         FROM categories
         ORDER BY CategoryID DESC`
    );
    return rows.map(normalizeCategory);
};

exports.getCategoryById = async (id) => {
    const rows = await query(
        `SELECT CategoryID, CategoryName, ParentID
         FROM categories
         WHERE CategoryID = ?
         LIMIT 1`,
        [id]
    );

    return rows.length ? normalizeCategory(rows[0]) : null;
};

exports.createCategory = async (payload = {}) => {
    const categoryName = String(payload.categoryName ?? payload.CategoryName ?? '').trim();
    const parentCategoryID = parseParentCategoryId(
        payload.parentCategoryID
        ?? payload.ParentCategoryID
        ?? payload.parentID
        ?? payload.ParentID
        ?? null
    );

    if (!categoryName) {
        throw toHttpError(400, 'categoryName la bat buoc.');
    }

    const result = await query(
        'INSERT INTO categories (CategoryName, ParentID) VALUES (?, ?)',
        [categoryName, parentCategoryID]
    );

    return {
        id: result.insertId,
        categoryName,
        parentCategoryID,
    };
};

exports.updateCategory = async (id, payload = {}) => {
    const safeId = Number(id);
    const updates = [];
    const params = [];

    if (payload.categoryName != null || payload.CategoryName != null) {
        const categoryName = String(payload.categoryName ?? payload.CategoryName ?? '').trim();
        if (!categoryName) {
            throw toHttpError(400, 'categoryName khong duoc de trong.');
        }
        updates.push('CategoryName = ?');
        params.push(categoryName);
    }

    if (
        Object.prototype.hasOwnProperty.call(payload, 'parentCategoryID')
        || Object.prototype.hasOwnProperty.call(payload, 'ParentCategoryID')
        || Object.prototype.hasOwnProperty.call(payload, 'parentID')
        || Object.prototype.hasOwnProperty.call(payload, 'ParentID')
    ) {
        const parentCategoryID = parseParentCategoryId(
            payload.parentCategoryID
            ?? payload.ParentCategoryID
            ?? payload.parentID
            ?? payload.ParentID
        );

        updates.push('ParentID = ?');
        params.push(parentCategoryID);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    params.push(safeId);
    const result = await query(`UPDATE categories SET ${updates.join(', ')} WHERE CategoryID = ?`, params);
    if (!result.affectedRows) {
        return null;
    }

    return exports.getCategoryById(safeId);
};

exports.deleteCategory = async (id) => {
    const result = await query('DELETE FROM categories WHERE CategoryID = ?', [id]);
    return result.affectedRows;
};