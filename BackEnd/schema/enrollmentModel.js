const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeEnrollment(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.EnrollmentID,
        userId: row.UserID,
        course: {
            id: row.CourseID,
            courseName: row.CourseName,
            image: row.Imag,
            description: row.Description,
        },
        courseId: row.CourseID,
        enrollmentDate: row.EnrollmentDate,
        completionStatus: row.CompletionStatus,
        sumPrice: Number(row.SumPrice || 0),
        currentLessonID: row.CurrentLessonID,
    };
}

function parsePositiveInt(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

function parseNullablePositiveInt(value, fieldName) {
    if (value == null || value === '') {
        return null;
    }
    return parsePositiveInt(value, fieldName);
}

async function findEnrollmentRow(userId, courseId) {
    const rows = await query(
        `SELECT e.*, c.CourseName, c.Imag, c.Description
         FROM enrollment e
         LEFT JOIN courses c ON c.CourseID = e.CourseID
         WHERE e.UserID = ? AND e.CourseID = ?
         LIMIT 1`,
        [userId, courseId]
    );

    return rows[0] || null;
}

exports.getAllEnrollments = async () => {
    const rows = await query('SELECT * FROM enrollment ORDER BY EnrollmentID DESC');
    return rows.map(normalizeEnrollment);
};

exports.getEnrollmentById = async (id) => {
    const rows = await query('SELECT * FROM enrollment WHERE EnrollmentID = ? LIMIT 1', [id]);
    return rows.length ? normalizeEnrollment(rows[0]) : null;
};

exports.createEnrollment = async (payload = {}) => {
    const userId = parsePositiveInt(payload.userId ?? payload.UserID, 'userId');
    const courseId = parsePositiveInt(payload.courseId ?? payload.CourseID, 'courseId');
    const completionStatus = String(payload.completionStatus ?? payload.CompletionStatus ?? 'Not Started').trim() || 'Not Started';
    const currentLessonID = parseNullablePositiveInt(payload.currentLessonID ?? payload.CurrentLessonID ?? null, 'currentLessonID');

    const existed = await findEnrollmentRow(userId, courseId);
    if (existed) {
        return normalizeEnrollment(existed);
    }

    const result = await query(
        `INSERT INTO enrollment (UserID, CourseID, EnrollmentDate, CompletionStatus, CurrentLessonID)
         VALUES (?, ?, NOW(), ?, ?)`,
        [userId, courseId, completionStatus, currentLessonID]
    );

    return exports.getEnrollmentById(result.insertId);
};

exports.updateEnrollment = async (id, payload = {}) => {
    const safeId = Number(id);
    const existed = await exports.getEnrollmentById(safeId);
    if (!existed) {
        return null;
    }

    const updates = [];
    const params = [];

    if (payload.completionStatus != null || payload.CompletionStatus != null) {
        const completionStatus = String(payload.completionStatus ?? payload.CompletionStatus ?? '').trim();
        if (!completionStatus) {
            throw toHttpError(400, 'completionStatus khong duoc de trong.');
        }
        updates.push('CompletionStatus = ?');
        params.push(completionStatus);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'currentLessonID') || Object.prototype.hasOwnProperty.call(payload, 'CurrentLessonID')) {
        const currentLessonID = parseNullablePositiveInt(payload.currentLessonID ?? payload.CurrentLessonID, 'currentLessonID');
        updates.push('CurrentLessonID = ?');
        params.push(currentLessonID);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    params.push(safeId);
    await query(`UPDATE enrollment SET ${updates.join(', ')} WHERE EnrollmentID = ?`, params);
    return exports.getEnrollmentById(safeId);
};

exports.deleteEnrollment = async (id) => {
    const result = await query('DELETE FROM enrollment WHERE EnrollmentID = ?', [id]);
    return result.affectedRows;
};

exports.getEnrollmentsByUserId = async (userId) => {
    const rows = await query(
        `SELECT e.*, c.CourseName, c.Imag, c.Description
         FROM enrollment e
         LEFT JOIN courses c ON c.CourseID = e.CourseID
         WHERE e.UserID = ?
         ORDER BY e.EnrollmentDate DESC`,
        [userId]
    );
    return rows.map(normalizeEnrollment);
};

exports.getEnrollmentByUserAndCourse = async (userId, courseId) => {
    const enrollment = await findEnrollmentRow(userId, courseId);
    return normalizeEnrollment(enrollment);
};

exports.checkEnrollment = async (userId, courseId) => {
    const enrollment = await exports.getEnrollmentByUserAndCourse(userId, courseId);
    return {
        isEnrolled: Boolean(enrollment),
        enrollment,
    };
};

exports.updateCurrentLesson = async (enrollmentId, lessonId) => {
    const result = await query('UPDATE enrollment SET CurrentLessonID = ? WHERE EnrollmentID = ?', [lessonId, enrollmentId]);
    return result.affectedRows;
};