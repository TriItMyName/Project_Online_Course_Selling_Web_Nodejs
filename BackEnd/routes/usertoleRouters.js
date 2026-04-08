const express = require('express');
const userRoleController = require('../controllers/userroleController');
const { requireRole } = require('../middleware/auth');
const { validatePositiveIntParam } = require('../utils/validator');

const router = express.Router();

router.get('/userroles', requireRole('Admin'), async (_req, res, next) => {
	try {
		const userRoles = await userRoleController.GetAllUserRoles();
		return res.json(userRoles);
	} catch (error) {
		return next(error);
	}
});

router.get(
	'/userroles/:userId/:roleId',
	requireRole('Admin'),
	validatePositiveIntParam('userId', 'userId'),
	validatePositiveIntParam('roleId', 'roleId'),
	async (req, res, next) => {
		try {
			const userId = req.validated?.userId ?? Number(req.params.userId);
			const roleId = req.validated?.roleId ?? Number(req.params.roleId);
			const userRole = await userRoleController.FindUserRoleById(userId, roleId);

			if (!userRole) {
				return res.status(404).json({ message: 'UserRole khong ton tai.' });
			}

			return res.json(userRole);
		} catch (error) {
			return next(error);
		}
	}
);

router.post('/userroles', requireRole('Admin'), async (req, res, next) => {
	try {
		const payload = req.body || {};
		const userRole = await userRoleController.CreateUserRole(payload);
		return res.status(201).json(userRole);
	} catch (error) {
		return next(error);
	}
});

router.put(
	'/userroles/:userId/:roleId',
	requireRole('Admin'),
	validatePositiveIntParam('userId', 'userId'),
	validatePositiveIntParam('roleId', 'roleId'),
	async (req, res, next) => {
		try {
			const userId = req.validated?.userId ?? Number(req.params.userId);
			const roleId = req.validated?.roleId ?? Number(req.params.roleId);
			const payload = req.body || {};
			const updatedUserRole = await userRoleController.ModifyUserRole(userId, roleId, payload);

			if (!updatedUserRole) {
				return res.status(404).json({ message: 'UserRole khong ton tai.' });
			}

			return res.json(updatedUserRole);
		} catch (error) {
			return next(error);
		}
	}
);

router.delete(
	'/userroles/:userId/:roleId',
	requireRole('Admin'),
	validatePositiveIntParam('userId', 'userId'),
	validatePositiveIntParam('roleId', 'roleId'),
	async (req, res, next) => {
		try {
			const userId = req.validated?.userId ?? Number(req.params.userId);
			const roleId = req.validated?.roleId ?? Number(req.params.roleId);
			const deletedCount = await userRoleController.DeleteUserRole(userId, roleId);

			if (!deletedCount) {
				return res.status(404).json({ message: 'UserRole khong ton tai.' });
			}

			return res.json({ message: 'Xoa user-role thanh cong.' });
		} catch (error) {
			return next(error);
		}
	}
);

module.exports = router;