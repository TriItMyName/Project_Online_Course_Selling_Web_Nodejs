const express = require('express');
const categoryController = require('../controllers/categoryController');
const { validatePositiveIntParam } = require('../utils/validator');

const router = express.Router();

router.get('/categories', async (_req, res, next) => {
	try {
		const categories = await categoryController.GetAllCategories();
		return res.json(categories);
	} catch (error) {
		return next(error);
	}
});

router.get('/categories/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const category = await categoryController.FindCategoryById(id);

		if (!category) {
			return res.status(404).json({ message: 'Category khong ton tai.' });
		}

		return res.json(category);
	} catch (error) {
		return next(error);
	}
});

router.post('/categories', async (req, res, next) => {
	try {
		const payload = req.body || {};
		const category = await categoryController.CreateACategory(payload);
		return res.status(201).json(category);
	} catch (error) {
		return next(error);
	}
});

router.put('/categories/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedCategory = await categoryController.ModifyCategory(id, payload);

		if (!updatedCategory) {
			return res.status(404).json({ message: 'Category khong ton tai.' });
		}

		return res.json(updatedCategory);
	} catch (error) {
		return next(error);
	}
});

router.delete('/categories/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await categoryController.DeleteCategory(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Category khong ton tai.' });
		}

		return res.json({ message: 'Xoa category thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;