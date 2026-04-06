const db = require('../config/db');

const query = db.queryAsync;
const withTransaction = db.withTransaction;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeOrder(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.OrderID,
        user: {
            id: row.UserID,
            username: row.UserName,
        },
        orderDate: row.OrderDate,
        totalAmount: Number(row.TotalAmount || 0),
        status: String(row.Status || 'PENDING').toUpperCase(),
        notes: row.Notes || '',
    };
}

function parsePositiveInt(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

function parseAmount(value) {
    if (value == null || value === '') {
        return 0;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw toHttpError(400, 'totalAmount khong hop le.');
    }
    return parsed;
}

function normalizeStatus(value) {
    if (value == null || String(value).trim() === '') {
        return null;
    }
    return String(value).trim().toUpperCase();
}

async function activateEnrollmentsForOrder(conn, orderId) {
    const [orderRows] = await conn.query('SELECT UserID FROM orders WHERE OrderID = ? LIMIT 1', [orderId]);
    if (!orderRows.length) {
        return;
    }

    const userId = orderRows[0].UserID;
    const [details] = await conn.query('SELECT CourseID FROM order_details WHERE OrderID = ?', [orderId]);
    for (const detail of details) {
        const [existing] = await conn.query(
            'SELECT EnrollmentID FROM enrollment WHERE UserID = ? AND CourseID = ? LIMIT 1',
            [userId, detail.CourseID]
        );

        if (!existing.length) {
            await conn.query(
                'INSERT INTO enrollment (UserID, CourseID, EnrollmentDate, CompletionStatus) VALUES (?, ?, NOW(), ?)',
                [userId, detail.CourseID, 'Not Started']
            );
        }
    }
}

exports.getAllOrders = async () => {
    const rows = await query(
        `SELECT o.*, u.UserName
         FROM orders o
         LEFT JOIN users u ON u.UserID = o.UserID
         ORDER BY o.OrderID DESC`
    );
    return rows.map(normalizeOrder);
};

exports.getOrdersByUserId = async (userId) => {
    const rows = await query(
        `SELECT o.*, u.UserName
         FROM orders o
         LEFT JOIN users u ON u.UserID = o.UserID
         WHERE o.UserID = ?
         ORDER BY o.OrderID DESC`,
        [userId]
    );
    return rows.map(normalizeOrder);
};

exports.getOrderById = async (id) => {
    const rows = await query(
        `SELECT o.*, u.UserName
         FROM orders o
         LEFT JOIN users u ON u.UserID = o.UserID
         WHERE o.OrderID = ?
         LIMIT 1`,
        [id]
    );
    return rows.length ? normalizeOrder(rows[0]) : null;
};

exports.createOrder = async (payload = {}) => {
    const userId = parsePositiveInt(payload.userId ?? payload.UserID, 'userId');
    const totalAmount = parseAmount(payload.totalAmount ?? payload.TotalAmount ?? 0);
    const status = normalizeStatus(payload.status ?? payload.Status) || 'PENDING';
    const notes = String(payload.notes ?? payload.Notes ?? '').trim();

    const result = await query(
        'INSERT INTO orders (UserID, OrderDate, TotalAmount, Status, Notes) VALUES (?, NOW(), ?, ?, ?)',
        [userId, totalAmount, status, notes]
    );

    return exports.getOrderById(result.insertId);
};

exports.updateOrder = async (id, payload = {}) => {
    const safeId = Number(id);
    const existed = await exports.getOrderById(safeId);
    if (!existed) {
        return null;
    }

    const updates = [];
    const params = [];
    let updatedStatus = null;

    if (payload.userId != null || payload.UserID != null) {
        const userId = parsePositiveInt(payload.userId ?? payload.UserID, 'userId');
        updates.push('UserID = ?');
        params.push(userId);
    }

    if (payload.totalAmount != null || payload.TotalAmount != null) {
        const totalAmount = parseAmount(payload.totalAmount ?? payload.TotalAmount);
        updates.push('TotalAmount = ?');
        params.push(totalAmount);
    }

    if (payload.status != null || payload.Status != null) {
        updatedStatus = normalizeStatus(payload.status ?? payload.Status);
        if (!updatedStatus) {
            throw toHttpError(400, 'status khong hop le.');
        }
        updates.push('Status = ?');
        params.push(updatedStatus);
    }

    if (payload.notes != null || payload.Notes != null) {
        const notes = String(payload.notes ?? payload.Notes ?? '').trim();
        updates.push('Notes = ?');
        params.push(notes);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    await withTransaction(async (conn) => {
        await conn.query(`UPDATE orders SET ${updates.join(', ')} WHERE OrderID = ?`, [...params, safeId]);
        if (updatedStatus === 'SUCCESS') {
            await activateEnrollmentsForOrder(conn, safeId);
        }
    });

    return exports.getOrderById(safeId);
};

exports.updateOrderStatus = async (id, status) => {
    const safeStatus = normalizeStatus(status);
    if (!safeStatus) {
        throw toHttpError(400, 'status khong hop le.');
    }

    const result = await query('UPDATE orders SET Status = ? WHERE OrderID = ?', [safeStatus, id]);
    return result.affectedRows;
};

exports.deleteOrder = async (id) => {
    return withTransaction(async (conn) => {
        await conn.query('DELETE FROM order_details WHERE OrderID = ?', [id]);
        const [result] = await conn.query('DELETE FROM orders WHERE OrderID = ?', [id]);
        return result.affectedRows;
    });
};

exports.getProcessedOrders = async (userId) => {
    const rows = await query(
        `SELECT o.*, u.UserName
         FROM orders o
         LEFT JOIN users u ON u.UserID = o.UserID
         WHERE o.UserID = ? AND UPPER(o.Status) = 'SUCCESS'
         ORDER BY o.OrderID DESC`,
        [userId]
    );
    return rows.map(normalizeOrder);
};

exports.filterOrders = async (filters = {}) => {
    const status = normalizeStatus(filters.status);
    const keyword = String(filters.keyword || '').trim();
    const timeStart = filters.timeStart || null;
    const timeEnd = filters.timeEnd || null;

    let sql = 'SELECT o.*, u.UserName FROM orders o LEFT JOIN users u ON u.UserID = o.UserID WHERE 1=1';
    const params = [];

    if (status) {
        sql += ' AND UPPER(o.Status) = ?';
        params.push(status);
    }

    if (keyword) {
        sql += ' AND (CAST(o.OrderID AS CHAR) LIKE ? OR u.UserName LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (timeStart) {
        sql += ' AND o.OrderDate >= ?';
        params.push(timeStart);
    }

    if (timeEnd) {
        sql += ' AND o.OrderDate <= ?';
        params.push(timeEnd);
    }

    sql += ' ORDER BY o.OrderID DESC';

    const rows = await query(sql, params);
    return rows.map(normalizeOrder);
};

exports.getAllOrdersWithUserName = exports.getAllOrders;
exports.getOrderWithUserNameById = exports.getOrderById;