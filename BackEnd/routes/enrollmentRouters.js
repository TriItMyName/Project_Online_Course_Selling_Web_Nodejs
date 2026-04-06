const express = require('express');
const enrollmentController = require('../controllers/enrollmentController');
const { validatePositiveIntParam } = require('../utils/validator');

const router = express.Router();

router.get('/enrollments', async (_req, res, next) => {
	try {
		const enrollments = await enrollmentController.GetAllEnrollments();
		return res.json(enrollments);
	} catch (error) {
		return next(error);
	}
});

router.post('/enrollments', async (req, res, next) => {
	try {
		const payload = req.body || {};
		const enrollment = await enrollmentController.CreateAnEnrollment(payload);
		return res.status(201).json(enrollment);
	} catch (error) {
		return next(error);
	}
});

router.put('/enrollments/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedEnrollment = await enrollmentController.ModifyEnrollment(id, payload);

		if (!updatedEnrollment) {
			return res.status(404).json({ message: 'Enrollment khong ton tai.' });
		}

		return res.json(updatedEnrollment);
	} catch (error) {
		return next(error);
	}
});

router.delete('/enrollments/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await enrollmentController.DeleteEnrollment(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Enrollment khong ton tai.' });
		}

		return res.json({ message: 'Xoa enrollment thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

router.get('/enrollments/user/:userId', validatePositiveIntParam('userId', 'userId'), async (req, res, next) => {
	try {
		const userId = req.validated?.userId ?? Number(req.params.userId);
		const enrollments = await enrollmentController.FindEnrollmentsByUserId(userId);
		return res.json(enrollments);
	} catch (error) {
		return next(error);
	}
});

router.get(
	'/enrollments/user/:userId/course/:courseId',
	validatePositiveIntParam('userId', 'userId'),
	validatePositiveIntParam('courseId', 'courseId'),
	async (req, res, next) => {
		try {
			const userId = req.validated?.userId ?? Number(req.params.userId);
			const courseId = req.validated?.courseId ?? Number(req.params.courseId);
			const enrollment = await enrollmentController.FindEnrollmentByUserAndCourse(userId, courseId);

			if (!enrollment) {
				return res.status(404).json({ message: 'Chua dang ky khoa hoc nay.' });
			}

			return res.json(enrollment);
		} catch (error) {
			return next(error);
		}
	}
);

router.get(
	'/enrollments/check/:userId/:courseId',
	validatePositiveIntParam('userId', 'userId'),
	validatePositiveIntParam('courseId', 'courseId'),
	async (req, res, next) => {
		try {
			const userId = req.validated?.userId ?? Number(req.params.userId);
			const courseId = req.validated?.courseId ?? Number(req.params.courseId);
			const result = await enrollmentController.CheckEnrollment(userId, courseId);
			return res.json(result);
		} catch (error) {
			return next(error);
		}
	}
);

router.get('/enrollments/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const enrollment = await enrollmentController.FindEnrollmentById(id);

		if (!enrollment) {
			return res.status(404).json({ message: 'Enrollment khong ton tai.' });
		}

		return res.json(enrollment);
	} catch (error) {
		return next(error);
	}
});

router.put('/enrollments/:id/current-lesson', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const lessonId = Number(req.body.lessonId ?? req.body.currentLessonID ?? req.body.CurrentLessonID);

		if (!Number.isInteger(lessonId) || lessonId <= 0) {
			return res.status(400).json({ message: 'lessonId la bat buoc.' });
		}

		const updatedCount = await enrollmentController.ModifyCurrentLesson(id, lessonId);
		if (!updatedCount) {
			return res.status(404).json({ message: 'Enrollment khong ton tai.' });
		}

		return res.json({ message: 'Cap nhat bai hoc hien tai thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;