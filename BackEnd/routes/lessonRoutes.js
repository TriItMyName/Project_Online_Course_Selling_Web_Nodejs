const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { requireRole } = require('../middleware/auth');
const { validatePositiveIntParam } = require('../utils/validator');

router.get('/', async (req, res, next) => {
	try {
		const lessons = await lessonController.GetAllLessons(req);
		return res.json(lessons);
	} catch (error) {
		return next(error);
	}
});

router.get('/course/:courseId', validatePositiveIntParam('courseId', 'courseId'), async (req, res, next) => {
	try {
		const courseId = req.validated?.courseId ?? Number(req.params.courseId);
		const lessons = await lessonController.FindLessonsByCourseId(req, courseId);
		return res.json(lessons);
	} catch (error) {
		return next(error);
	}
});

router.get('/course/:courseId/ordered', validatePositiveIntParam('courseId', 'courseId'), async (req, res, next) => {
	try {
		const courseId = req.validated?.courseId ?? Number(req.params.courseId);
		const lessons = await lessonController.FindOrderedLessonsByCourseId(req, courseId);
		return res.json(lessons);
	} catch (error) {
		return next(error);
	}
});

router.get('/course/:courseId/first', validatePositiveIntParam('courseId', 'courseId'), async (req, res, next) => {
	try {
		const courseId = req.validated?.courseId ?? Number(req.params.courseId);
		const lesson = await lessonController.FindFirstLessonByCourseId(req, courseId);

		if (!lesson) {
			return res.status(404).json({ message: 'Course chua co bai hoc.' });
		}

		return res.json(lesson);
	} catch (error) {
		return next(error);
	}
});

router.get('/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const lesson = await lessonController.FindLessonById(req, id);

		if (!lesson) {
			return res.status(404).json({ message: 'Lesson khong ton tai.' });
		}

		return res.json(lesson);
	} catch (error) {
		return next(error);
	}
});

router.post('/', requireRole('Admin'), async (req, res, next) => {
	try {
		const payload = req.body || {};
		const lesson = await lessonController.CreateALesson(req, payload);
		return res.status(201).json(lesson);
	} catch (error) {
		return next(error);
	}
});

router.put('/:id', requireRole('Admin'), validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedLesson = await lessonController.ModifyLesson(req, id, payload);

		if (!updatedLesson) {
			return res.status(404).json({ message: 'Lesson khong ton tai.' });
		}

		return res.json(updatedLesson);
	} catch (error) {
		return next(error);
	}
});

router.delete('/:id', requireRole('Admin'), validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await lessonController.DeleteLesson(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Lesson khong ton tai.' });
		}

		return res.json({ message: 'Xoa lesson thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;