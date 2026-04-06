const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeLesson(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.LessonID,
        course: { id: row.CourseID },
        courseId: row.CourseID,
        lessonTitle: row.LessonTitle,
        videoURL: String(row.VideoURL ?? row.videourl ?? '').trim(),
        duration: Number(row.Duration || 0),
        orderIndex: Number(row.OrderIndex || 1),
        createdAt: row.CreatedAt || null,
    };
}

function parsePositiveInt(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

function parseDuration(value) {
    if (value == null || value === '') {
        return 0;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw toHttpError(400, 'duration khong hop le.');
    }
    return parsed;
}

exports.getAllLessons = async () => {
    const rows = await query('SELECT * FROM lessons ORDER BY CourseID ASC, OrderIndex ASC');
    return rows.map(normalizeLesson);
};

exports.getLessonById = async (id) => {
    const rows = await query('SELECT * FROM lessons WHERE LessonID = ? LIMIT 1', [id]);
    return rows.length ? normalizeLesson(rows[0]) : null;
};

exports.getLessonsByCourseId = async (courseId) => {
    const rows = await query('SELECT * FROM lessons WHERE CourseID = ? ORDER BY OrderIndex ASC', [courseId]);
    return rows.map(normalizeLesson);
};

exports.getFirstLessonByCourseId = async (courseId) => {
    const rows = await query('SELECT * FROM lessons WHERE CourseID = ? ORDER BY OrderIndex ASC LIMIT 1', [courseId]);
    return rows.length ? normalizeLesson(rows[0]) : null;
};

exports.createLesson = async (payload = {}) => {
    const courseId = parsePositiveInt(payload?.course?.id ?? payload.courseId ?? payload.CourseID, 'courseId');
    const lessonTitle = String(payload.lessonTitle ?? payload.LessonTitle ?? '').trim();
    const videoURL = String(payload.videoURL ?? payload.videourl ?? payload.VideoURL ?? '').trim();
    const duration = parseDuration(payload.duration ?? payload.Duration ?? 0);
    const orderIndex = payload.orderIndex == null && payload.OrderIndex == null
        ? 1
        : parsePositiveInt(payload.orderIndex ?? payload.OrderIndex, 'orderIndex');

    if (!lessonTitle) {
        throw toHttpError(400, 'lessonTitle la bat buoc.');
    }

    const result = await query(
        'INSERT INTO lessons (CourseID, LessonTitle, videourl, Duration, OrderIndex) VALUES (?, ?, ?, ?, ?)',
        [courseId, lessonTitle, videoURL, duration, orderIndex]
    );

    return exports.getLessonById(result.insertId);
};

exports.updateLesson = async (id, payload = {}) => {
    const safeId = Number(id);
    const existed = await exports.getLessonById(safeId);
    if (!existed) {
        return null;
    }

    const updates = [];
    const params = [];

    if (payload.courseId != null || payload.CourseID != null || payload?.course?.id != null) {
        const courseId = parsePositiveInt(payload?.course?.id ?? payload.courseId ?? payload.CourseID, 'courseId');
        updates.push('CourseID = ?');
        params.push(courseId);
    }

    if (payload.lessonTitle != null || payload.LessonTitle != null) {
        const lessonTitle = String(payload.lessonTitle ?? payload.LessonTitle ?? '').trim();
        if (!lessonTitle) {
            throw toHttpError(400, 'lessonTitle khong duoc de trong.');
        }
        updates.push('LessonTitle = ?');
        params.push(lessonTitle);
    }

    if (payload.videoURL != null || payload.videourl != null || payload.VideoURL != null) {
        const videoURL = String(payload.videoURL ?? payload.videourl ?? payload.VideoURL ?? '').trim();
        updates.push('videourl = ?');
        params.push(videoURL);
    }

    if (payload.duration != null || payload.Duration != null) {
        const duration = parseDuration(payload.duration ?? payload.Duration);
        updates.push('Duration = ?');
        params.push(duration);
    }

    if (payload.orderIndex != null || payload.OrderIndex != null) {
        const orderIndex = parsePositiveInt(payload.orderIndex ?? payload.OrderIndex, 'orderIndex');
        updates.push('OrderIndex = ?');
        params.push(orderIndex);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    params.push(safeId);
    await query(`UPDATE lessons SET ${updates.join(', ')} WHERE LessonID = ?`, params);
    return exports.getLessonById(safeId);
};

exports.deleteLesson = async (id) => {
    const result = await query('DELETE FROM lessons WHERE LessonID = ?', [id]);
    return result.affectedRows;
};