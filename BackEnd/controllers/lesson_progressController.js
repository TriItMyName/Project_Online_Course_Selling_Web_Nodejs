const lessonProgressModel = require('../schema/lesson_progressModel');

exports.GetProgressByEnrollmentId = async (enrollmentId) => {
    return lessonProgressModel.getProgressByEnrollmentId(enrollmentId);
};

exports.FindProgressByEnrollmentAndLesson = async (enrollmentId, lessonId) => {
    return lessonProgressModel.getProgressByEnrollmentAndLesson(enrollmentId, lessonId);
};

exports.CreateProgress = async (payload) => {
    return lessonProgressModel.createOrUpdateProgress(payload);
};

exports.ModifyProgressById = async (id, payload) => {
    return lessonProgressModel.updateProgressById(id, payload);
};

exports.UpdateProgress = async (payload) => {
    return lessonProgressModel.createOrUpdateProgress(payload);
};

exports.MarkLessonCompleted = async (enrollmentId, lessonId) => {
    return lessonProgressModel.markLessonCompleted(enrollmentId, lessonId);
};

exports.GetProgressStats = async (enrollmentId) => {
    return lessonProgressModel.getProgressStats(enrollmentId);
};

exports.DeleteProgress = async (enrollmentId, lessonId) => {
    return lessonProgressModel.deleteProgress(enrollmentId, lessonId);
};