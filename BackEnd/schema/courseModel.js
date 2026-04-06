const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeCourse(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.CourseID,
        courseName: row.CourseName,
        description: row.Description ?? row.description ?? '',
        category: { id: row.CategoryID },
        categoryID: row.CategoryID,
        price: Number(row.Price ?? row.price ?? 0),
        image: String(row.Imag ?? row.imag ?? row.Image ?? row.image ?? '').trim(),
        createTime: row.CreatedAt || row.CreateTime || null,
    };
}

function parseCourseId(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

function parsePrice(value) {
    if (value == null || value === '') {
        return 0;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw toHttpError(400, 'price khong hop le.');
    }
    return parsed;
}

exports.getAllCourses = async () => {
    const rows = await query('SELECT * FROM courses ORDER BY CourseID DESC');
    return rows.map(normalizeCourse);
};

exports.getCourseById = async (id) => {
    const rows = await query('SELECT * FROM courses WHERE CourseID = ? LIMIT 1', [id]);
    return rows.length ? normalizeCourse(rows[0]) : null;
};

exports.getCoursesByCategoryId = async (categoryId) => {
    const rows = await query('SELECT * FROM courses WHERE CategoryID = ? ORDER BY CourseID DESC', [categoryId]);
    return rows.map(normalizeCourse);
};

exports.createCourse = async (payload = {}) => {
    const courseName = String(payload.courseName ?? payload.CourseName ?? '').trim();
    const description = String(payload.description ?? payload.Description ?? '').trim();
    const categoryID = parseCourseId(payload?.category?.id ?? payload.categoryID ?? payload.CategoryID, 'categoryID');
    const price = parsePrice(payload.price ?? payload.Price ?? 0);
    const image = String(payload.image ?? payload.imag ?? payload.Imag ?? '').trim();

    if (!courseName) {
        throw toHttpError(400, 'courseName la bat buoc.');
    }

    const result = await query(
        'INSERT INTO courses (CourseName, Description, CategoryID, Price, Imag) VALUES (?, ?, ?, ?, ?)',
        [courseName, description, categoryID, price, image]
    );

    return exports.getCourseById(result.insertId);
};

exports.updateCourse = async (id, payload = {}) => {
    const safeId = Number(id);
    const existed = await exports.getCourseById(safeId);
    if (!existed) {
        return null;
    }

    const updates = [];
    const params = [];

    if (payload.courseName != null || payload.CourseName != null) {
        const courseName = String(payload.courseName ?? payload.CourseName ?? '').trim();
        if (!courseName) {
            throw toHttpError(400, 'courseName khong duoc de trong.');
        }
        updates.push('CourseName = ?');
        params.push(courseName);
    }

    if (payload.description != null || payload.Description != null) {
        const description = String(payload.description ?? payload.Description ?? '').trim();
        updates.push('Description = ?');
        params.push(description);
    }

    if (payload.categoryID != null || payload.CategoryID != null || payload?.category?.id != null) {
        const categoryID = parseCourseId(payload?.category?.id ?? payload.categoryID ?? payload.CategoryID, 'categoryID');
        updates.push('CategoryID = ?');
        params.push(categoryID);
    }

    if (payload.price != null || payload.Price != null) {
        const price = parsePrice(payload.price ?? payload.Price);
        updates.push('Price = ?');
        params.push(price);
    }

    if (payload.image != null || payload.imag != null || payload.Imag != null) {
        const image = String(payload.image ?? payload.imag ?? payload.Imag ?? '').trim();
        updates.push('Imag = ?');
        params.push(image);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    params.push(safeId);
    await query(`UPDATE courses SET ${updates.join(', ')} WHERE CourseID = ?`, params);
    return exports.getCourseById(safeId);
};

exports.deleteCourse = async (id) => {
    const result = await query('DELETE FROM courses WHERE CourseID = ?', [id]);
    return result.affectedRows;
};