const express = require('express');
const roleController = require('../controllers/roleController');
const { validatePositiveIntParam } = require('../utils/validator');

const router = express.Router();

router.get('/roles', async (_req, res, next) => {
	try {
		const roles = await roleController.GetAllRoles();
		return res.json(roles);
	} catch (error) {
		return next(error);
	}
});

router.get('/roles/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const role = await roleController.FindRoleById(id);

		if (!role) {
			return res.status(404).json({ message: 'Role khong ton tai.' });
		}

		return res.json(role);
	} catch (error) {
		return next(error);
	}
});

router.post('/roles', async (req, res, next) => {
	try {
		const payload = req.body || {};
		const role = await roleController.CreateARole(payload);
		return res.status(201).json(role);
	} catch (error) {
		return next(error);
	}
});

router.put('/roles/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedRole = await roleController.ModifyRole(id, payload);

		if (!updatedRole) {
			return res.status(404).json({ message: 'Role khong ton tai.' });
		}

		return res.json(updatedRole);
	} catch (error) {
		return next(error);
	}
});

router.delete('/roles/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await roleController.DeleteRole(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Role khong ton tai.' });
		}

		return res.json({ message: 'Xoa role thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;


