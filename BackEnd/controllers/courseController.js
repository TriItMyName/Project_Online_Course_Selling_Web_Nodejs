const courseModel = require('../schema/courseModel');
const { normalizeImageUrl } = require('../utils/media');

function withImageUrl(req, course) {
    if (!course) {
        return null;
    }

    return {
        ...course,
        image: normalizeImageUrl(req, course.image),
    };
}

exports.GetAllCourses = async (req) => {
    const courses = await courseModel.getAllCourses();
    return courses.map((course) => withImageUrl(req, course));
};

exports.FindCourseById = async (req, id) => {
    const course = await courseModel.getCourseById(id);
    return withImageUrl(req, course);
};

exports.CreateACourse = async (req, payload) => {
    const course = await courseModel.createCourse(payload);
    return withImageUrl(req, course);
};

exports.ModifyCourse = async (req, id, payload) => {
    const course = await courseModel.updateCourse(id, payload);
    return withImageUrl(req, course);
};

exports.DeleteCourse = async (id) => {
    return courseModel.deleteCourse(id);
};

exports.FindCoursesByCategoryId = async (req, categoryId) => {
    const courses = await courseModel.getCoursesByCategoryId(categoryId);
    return courses.map((course) => withImageUrl(req, course));
};