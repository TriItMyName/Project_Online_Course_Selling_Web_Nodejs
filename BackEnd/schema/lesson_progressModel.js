const db = require('../config/db');

const query = db.queryAsync;

function toHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeProgress(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.ProgressID,
        enrollment: { id: row.EnrollmentID },
        lesson: { id: row.LessonID, lessonTitle: row.LessonTitle },
        enrollmentId: row.EnrollmentID,
        lessonId: row.LessonID,
        watchedPercentage: Number(row.WatchedPercentage || 0),
        isCompleted: Boolean(row.IsCompleted),
        lastWatchedAt: row.LastWatchedAt,
    };
}

function parsePositiveInt(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw toHttpError(400, `${fieldName} khong hop le.`);
    }
    return parsed;
}

function parsePercentage(value) {
    if (value == null || value === '') {
        return 0;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        throw toHttpError(400, 'watchedPercentage khong hop le.');
    }
    return parsed;
}

function parseBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return String(value || '').toLowerCase() === 'true';
}

exports.getProgressByEnrollmentId = async (enrollmentId) => {
    const rows = await query(
        `SELECT lp.*, l.LessonTitle
         FROM lesson_progress lp
         LEFT JOIN lessons l ON l.LessonID = lp.LessonID
         WHERE lp.EnrollmentID = ?
         ORDER BY l.OrderIndex ASC`,
        [enrollmentId]
    );

    return rows.map(normalizeProgress);
};

exports.getProgressByEnrollmentAndLesson = async (enrollmentId, lessonId) => {
    const rows = await query(
        `SELECT lp.*, l.LessonTitle
         FROM lesson_progress lp
         LEFT JOIN lessons l ON l.LessonID = lp.LessonID
         WHERE lp.EnrollmentID = ? AND lp.LessonID = ?
         LIMIT 1`,
        [enrollmentId, lessonId]
    );

    return rows.length ? normalizeProgress(rows[0]) : null;
};

exports.createOrUpdateProgress = async (payload = {}) => {
    const enrollmentId = parsePositiveInt(payload?.enrollment?.id ?? payload.EnrollmentID ?? payload.enrollmentId, 'enrollmentId');
    const lessonId = parsePositiveInt(payload?.lesson?.id ?? payload.LessonID ?? payload.lessonId, 'lessonId');
    const watchedPercentage = parsePercentage(payload.watchedPercentage ?? payload.WatchedPercentage ?? 0);
    const isCompleted = parseBoolean(payload.isCompleted ?? payload.IsCompleted ?? false);

    const existed = await query(
        'SELECT * FROM lesson_progress WHERE EnrollmentID = ? AND LessonID = ? LIMIT 1',
        [enrollmentId, lessonId]
    );

    if (existed.length) {
        const previous = existed[0];
        const mergedPercent = Math.max(Number(previous.WatchedPercentage || 0), watchedPercentage);
        const mergedCompleted = Boolean(previous.IsCompleted) || isCompleted;

        await query(
            `UPDATE lesson_progress
             SET WatchedPercentage = ?, IsCompleted = ?, LastWatchedAt = NOW()
             WHERE ProgressID = ?`,
            [mergedPercent, mergedCompleted ? 1 : 0, previous.ProgressID]
        );

        const rows = await query(
            `SELECT lp.*, l.LessonTitle
             FROM lesson_progress lp
             LEFT JOIN lessons l ON l.LessonID = lp.LessonID
             WHERE lp.ProgressID = ?
             LIMIT 1`,
            [previous.ProgressID]
        );
        return normalizeProgress(rows[0]);
    }

    const result = await query(
        `INSERT INTO lesson_progress (EnrollmentID, LessonID, WatchedPercentage, IsCompleted, LastWatchedAt)
         VALUES (?, ?, ?, ?, NOW())`,
        [enrollmentId, lessonId, watchedPercentage, isCompleted ? 1 : 0]
    );

    const rows = await query(
        `SELECT lp.*, l.LessonTitle
         FROM lesson_progress lp
         LEFT JOIN lessons l ON l.LessonID = lp.LessonID
         WHERE lp.ProgressID = ?
         LIMIT 1`,
        [result.insertId]
    );
    return normalizeProgress(rows[0]);
};

exports.updateProgressById = async (id, payload = {}) => {
    const safeId = Number(id);
    const existedRows = await query('SELECT * FROM lesson_progress WHERE ProgressID = ? LIMIT 1', [safeId]);
    if (!existedRows.length) {
        return null;
    }

    const updates = [];
    const params = [];

    if (payload.enrollmentId != null || payload.EnrollmentID != null || payload?.enrollment?.id != null) {
        const enrollmentId = parsePositiveInt(payload?.enrollment?.id ?? payload.enrollmentId ?? payload.EnrollmentID, 'enrollmentId');
        updates.push('EnrollmentID = ?');
        params.push(enrollmentId);
    }

    if (payload.lessonId != null || payload.LessonID != null || payload?.lesson?.id != null) {
        const lessonId = parsePositiveInt(payload?.lesson?.id ?? payload.lessonId ?? payload.LessonID, 'lessonId');
        updates.push('LessonID = ?');
        params.push(lessonId);
    }

    if (payload.watchedPercentage != null || payload.WatchedPercentage != null) {
        const watchedPercentage = parsePercentage(payload.watchedPercentage ?? payload.WatchedPercentage);
        updates.push('WatchedPercentage = ?');
        params.push(watchedPercentage);
    }

    if (payload.isCompleted != null || payload.IsCompleted != null) {
        const isCompleted = parseBoolean(payload.isCompleted ?? payload.IsCompleted);
        updates.push('IsCompleted = ?');
        params.push(isCompleted ? 1 : 0);
    }

    if (!updates.length) {
        throw toHttpError(400, 'Khong co du lieu de cap nhat.');
    }

    updates.push('LastWatchedAt = NOW()');
    params.push(safeId);
    await query(`UPDATE lesson_progress SET ${updates.join(', ')} WHERE ProgressID = ?`, params);

    const rows = await query(
        `SELECT lp.*, l.LessonTitle
         FROM lesson_progress lp
         LEFT JOIN lessons l ON l.LessonID = lp.LessonID
         WHERE lp.ProgressID = ?
         LIMIT 1`,
        [safeId]
    );
    return normalizeProgress(rows[0]);
};

exports.markLessonCompleted = async (enrollmentId, lessonId) => {
    const existed = await query(
        'SELECT ProgressID FROM lesson_progress WHERE EnrollmentID = ? AND LessonID = ? LIMIT 1',
        [enrollmentId, lessonId]
    );

    if (existed.length) {
        await query(
            'UPDATE lesson_progress SET WatchedPercentage = 100, IsCompleted = 1, LastWatchedAt = NOW() WHERE ProgressID = ?',
            [existed[0].ProgressID]
        );
        return existed[0].ProgressID;
    }

    const result = await query(
        'INSERT INTO lesson_progress (EnrollmentID, LessonID, WatchedPercentage, IsCompleted, LastWatchedAt) VALUES (?, ?, 100, 1, NOW())',
        [enrollmentId, lessonId]
    );
    return result.insertId;
};

exports.getProgressStats = async (enrollmentId) => {
    const rows = await query(
        `SELECT
             COUNT(*) AS totalLessons,
             SUM(CASE WHEN IsCompleted = 1 THEN 1 ELSE 0 END) AS completedLessons,
             AVG(WatchedPercentage) AS averageProgress
         FROM lesson_progress
         WHERE EnrollmentID = ?`,
        [enrollmentId]
    );

    return rows[0] || {
        totalLessons: 0,
        completedLessons: 0,
        averageProgress: 0,
    };
};

exports.deleteProgress = async (enrollmentId, lessonId) => {
    const result = await query('DELETE FROM lesson_progress WHERE EnrollmentID = ? AND LessonID = ?', [enrollmentId, lessonId]);
    return result.affectedRows;
};