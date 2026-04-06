const lessonModel = require('../schema/lessonModel');
const { normalizeVideoUrl } = require('../utils/media');

function withVideoUrl(req, lesson) {
    if (!lesson) {
        return null;
    }

    return {
        ...lesson,
        videoURL: normalizeVideoUrl(req, lesson.videoURL),
    };
}

exports.GetAllLessons = async (req) => {
    const lessons = await lessonModel.getAllLessons();
    return lessons.map((lesson) => withVideoUrl(req, lesson));
};

exports.FindLessonById = async (req, id) => {
    const lesson = await lessonModel.getLessonById(id);
    return withVideoUrl(req, lesson);
};

exports.FindLessonsByCourseId = async (req, courseId) => {
    const lessons = await lessonModel.getLessonsByCourseId(courseId);
    return lessons.map((lesson) => withVideoUrl(req, lesson));
};

exports.FindOrderedLessonsByCourseId = exports.FindLessonsByCourseId;

exports.CreateALesson = async (req, payload) => {
    const lesson = await lessonModel.createLesson(payload);
    return withVideoUrl(req, lesson);
};

exports.ModifyLesson = async (req, id, payload) => {
    const lesson = await lessonModel.updateLesson(id, payload);
    return withVideoUrl(req, lesson);
};

exports.DeleteLesson = async (id) => {
    return lessonModel.deleteLesson(id);
};

exports.FindFirstLessonByCourseId = async (req, courseId) => {
    const lesson = await lessonModel.getFirstLessonByCourseId(courseId);
    return withVideoUrl(req, lesson);
};