const express = require('express');
const router = express.Router();
const lessonProgressController = require('../controllers/lesson_progressController');
const { validatePositiveIntParam } = require('../utils/validator');

router.get('/enrollment/:enrollmentId', validatePositiveIntParam('enrollmentId', 'enrollmentId'), async (req, res, next) => {
	try {
		const enrollmentId = req.validated?.enrollmentId ?? Number(req.params.enrollmentId);
		const progressList = await lessonProgressController.GetProgressByEnrollmentId(enrollmentId);
		return res.json(progressList);
	} catch (error) {
		return next(error);
	}
});

router.get(
	'/enrollment/:enrollmentId/lesson/:lessonId',
	validatePositiveIntParam('enrollmentId', 'enrollmentId'),
	validatePositiveIntParam('lessonId', 'lessonId'),
	async (req, res, next) => {
		try {
			const enrollmentId = req.validated?.enrollmentId ?? Number(req.params.enrollmentId);
			const lessonId = req.validated?.lessonId ?? Number(req.params.lessonId);
			const progress = await lessonProgressController.FindProgressByEnrollmentAndLesson(enrollmentId, lessonId);

			if (!progress) {
				return res.status(404).json({ message: 'Khong tim thay tien do hoc.' });
			}

			return res.json(progress);
		} catch (error) {
			return next(error);
		}
	}
);

router.get('/enrollment/:enrollmentId/stats', validatePositiveIntParam('enrollmentId', 'enrollmentId'), async (req, res, next) => {
	try {
		const enrollmentId = req.validated?.enrollmentId ?? Number(req.params.enrollmentId);
		const stats = await lessonProgressController.GetProgressStats(enrollmentId);
		return res.json(stats);
	} catch (error) {
		return next(error);
	}
});

router.post('/', async (req, res, next) => {
	try {
		const payload = req.body || {};
		const progress = await lessonProgressController.CreateProgress(payload);
		return res.json(progress);
	} catch (error) {
		return next(error);
	}
});

router.put('/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedProgress = await lessonProgressController.ModifyProgressById(id, payload);

		if (!updatedProgress) {
			return res.status(404).json({ message: 'Tien do hoc khong ton tai.' });
		}

		return res.json(updatedProgress);
	} catch (error) {
		return next(error);
	}
});

router.post('/update', async (req, res, next) => {
	try {
		const payload = req.body || {};
		const progress = await lessonProgressController.UpdateProgress(payload);
		return res.json(progress);
	} catch (error) {
		return next(error);
	}
});

router.put(
	'/enrollment/:enrollmentId/lesson/:lessonId/complete',
	validatePositiveIntParam('enrollmentId', 'enrollmentId'),
	validatePositiveIntParam('lessonId', 'lessonId'),
	async (req, res, next) => {
		try {
			const enrollmentId = req.validated?.enrollmentId ?? Number(req.params.enrollmentId);
			const lessonId = req.validated?.lessonId ?? Number(req.params.lessonId);
			await lessonProgressController.MarkLessonCompleted(enrollmentId, lessonId);
			return res.json({ message: 'Danh dau hoan thanh bai hoc thanh cong.' });
		} catch (error) {
			return next(error);
		}
	}
);

router.delete(
	'/enrollment/:enrollmentId/lesson/:lessonId',
	validatePositiveIntParam('enrollmentId', 'enrollmentId'),
	validatePositiveIntParam('lessonId', 'lessonId'),
	async (req, res, next) => {
		try {
			const enrollmentId = req.validated?.enrollmentId ?? Number(req.params.enrollmentId);
			const lessonId = req.validated?.lessonId ?? Number(req.params.lessonId);
			await lessonProgressController.DeleteProgress(enrollmentId, lessonId);
			return res.json({ message: 'Xoa tien do hoc thanh cong.' });
		} catch (error) {
			return next(error);
		}
	}
);

module.exports = router;