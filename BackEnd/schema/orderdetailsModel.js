const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeOrderDetail(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.OrderDetailID,
        orderId: row.OrderID,
        course: { id: row.CourseID },
        courseId: row.CourseID,
    };
}

function parsePositiveInt(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

exports.getAllOrderDetails = async () => {
    const rows = await query('SELECT * FROM order_details ORDER BY OrderDetailID DESC');
    return rows.map(normalizeOrderDetail);
};

exports.getOrderDetailById = async (id) => {
    const rows = await query('SELECT * FROM order_details WHERE OrderDetailID = ? LIMIT 1', [id]);
    return rows.length ? normalizeOrderDetail(rows[0]) : null;
};

exports.createOrderDetail = async (payload = {}) => {
    const orderId = parsePositiveInt(payload.orderId ?? payload.OrderID, 'orderId');
    const courseId = parsePositiveInt(payload.courseId ?? payload.CourseID, 'courseId');

    const result = await query('INSERT INTO order_details (OrderID, CourseID) VALUES (?, ?)', [orderId, courseId]);
    return exports.getOrderDetailById(result.insertId);
};

exports.updateOrderDetail = async (id, payload = {}) => {
    const safeId = Number(id);
    const existed = await exports.getOrderDetailById(safeId);
    if (!existed) {
        return null;
    }

    const updates = [];
    const params = [];

    if (payload.orderId != null || payload.OrderID != null) {
        const orderId = parsePositiveInt(payload.orderId ?? payload.OrderID, 'orderId');
        updates.push('OrderID = ?');
        params.push(orderId);
    }

    if (payload.courseId != null || payload.CourseID != null) {
        const courseId = parsePositiveInt(payload.courseId ?? payload.CourseID, 'courseId');
        updates.push('CourseID = ?');
        params.push(courseId);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    params.push(safeId);
    await query(`UPDATE order_details SET ${updates.join(', ')} WHERE OrderDetailID = ?`, params);
    return exports.getOrderDetailById(safeId);
};

exports.deleteOrderDetail = async (id) => {
    const result = await query('DELETE FROM order_details WHERE OrderDetailID = ?', [id]);
    return result.affectedRows;
};

exports.getOrderDetailsByOrderId = async (orderId) => {
    const rows = await query('SELECT * FROM order_details WHERE OrderID = ? ORDER BY OrderDetailID ASC', [orderId]);
    return rows.map(normalizeOrderDetail);
};