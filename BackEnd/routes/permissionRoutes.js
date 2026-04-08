const express = require('express');
const permissionController = require('../controllers/permissionController');
const { requireRole } = require('../middleware/auth');
const { validatePositiveIntParam } = require('../utils/validator');

const router = express.Router();

router.get('/permissions', requireRole('Admin'), async (_req, res, next) => {
	try {
		const permissions = await permissionController.GetAllPermissions();
		return res.json(permissions);
	} catch (error) {
		return next(error);
	}
});

router.get('/permissions/:id', requireRole('Admin'), validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const permission = await permissionController.FindPermissionById(id);

		if (!permission) {
			return res.status(404).json({ message: 'Permission khong ton tai.' });
		}

		return res.json(permission);
	} catch (error) {
		return next(error);
	}
});

router.post('/permissions', requireRole('Admin'), async (req, res, next) => {
	try {
		const payload = req.body || {};
		const permission = await permissionController.CreateAPermission(payload);
		return res.status(201).json(permission);
	} catch (error) {
		return next(error);
	}
});

router.put('/permissions/:id', requireRole('Admin'), validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedPermission = await permissionController.ModifyPermission(id, payload);

		if (!updatedPermission) {
			return res.status(404).json({ message: 'Permission khong ton tai.' });
		}

		return res.json(updatedPermission);
	} catch (error) {
		return next(error);
	}
});

router.delete('/permissions/:id', requireRole('Admin'), validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await permissionController.DeletePermission(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Permission khong ton tai.' });
		}

		return res.json({ message: 'Xoa permission thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;