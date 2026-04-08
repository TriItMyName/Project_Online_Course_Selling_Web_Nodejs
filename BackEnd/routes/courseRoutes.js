const express = require('express');
const courseController = require('../controllers/courseController');
const { requireRole } = require('../middleware/auth');
const { validatePositiveIntParam } = require('../utils/validator');

const router = express.Router();

router.get('/courses', async (req, res, next) => {
	try {
		const courses = await courseController.GetAllCourses(req);
		return res.json(courses);
	} catch (error) {
		return next(error);
	}
});

router.get('/courses/category/:categoryId', validatePositiveIntParam('categoryId', 'categoryId'), async (req, res, next) => {
	try {
		const categoryId = req.validated?.categoryId ?? Number(req.params.categoryId);
		const courses = await courseController.FindCoursesByCategoryId(req, categoryId);
		return res.json(courses);
	} catch (error) {
		return next(error);
	}
});

router.get('/courses/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const course = await courseController.FindCourseById(req, id);

		if (!course) {
			return res.status(404).json({ message: 'Course khong ton tai.' });
		}

		return res.json(course);
	} catch (error) {
		return next(error);
	}
});

router.post('/courses', requireRole('Admin'), async (req, res, next) => {
	try {
		const payload = req.body || {};
		const course = await courseController.CreateACourse(req, payload);
		return res.status(201).json(course);
	} catch (error) {
		return next(error);
	}
});

router.put('/courses/:id', requireRole('Admin'), validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedCourse = await courseController.ModifyCourse(req, id, payload);

		if (!updatedCourse) {
			return res.status(404).json({ message: 'Course khong ton tai.' });
		}

		return res.json(updatedCourse);
	} catch (error) {
		return next(error);
	}
});

router.delete('/courses/:id', requireRole('Admin'), validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await courseController.DeleteCourse(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Course khong ton tai.' });
		}

		return res.json({ message: 'Xoa course thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;