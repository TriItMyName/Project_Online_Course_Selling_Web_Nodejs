const enrollmentModel = require('../schema/enrollmentModel');

exports.GetAllEnrollments = async () => {
    return enrollmentModel.getAllEnrollments();
};

exports.FindEnrollmentById = async (id) => {
    return enrollmentModel.getEnrollmentById(id);
};

exports.CreateAnEnrollment = async (payload) => {
    return enrollmentModel.createEnrollment(payload);
};

exports.ModifyEnrollment = async (id, payload) => {
    return enrollmentModel.updateEnrollment(id, payload);
};

exports.DeleteEnrollment = async (id) => {
    return enrollmentModel.deleteEnrollment(id);
};

exports.FindEnrollmentsByUserId = async (userId) => {
    return enrollmentModel.getEnrollmentsByUserId(userId);
};

exports.FindEnrollmentByUserAndCourse = async (userId, courseId) => {
    return enrollmentModel.getEnrollmentByUserAndCourse(userId, courseId);
};

exports.CheckEnrollment = async (userId, courseId) => {
    return enrollmentModel.checkEnrollment(userId, courseId);
};

exports.ModifyCurrentLesson = async (enrollmentId, lessonId) => {
    return enrollmentModel.updateCurrentLesson(enrollmentId, lessonId);
};