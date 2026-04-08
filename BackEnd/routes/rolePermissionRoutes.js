const express = require('express');
const rolePermissionController = require('../controllers/rolePermissionController');
const { requireRole } = require('../middleware/auth');
const { validatePositiveIntParam } = require('../utils/validator');

const router = express.Router();

router.get('/rolepermissions', requireRole('Admin'), async (_req, res, next) => {
	try {
		const rolePermissions = await rolePermissionController.GetAllRolePermissions();
		return res.json(rolePermissions);
	} catch (error) {
		return next(error);
	}
});

router.get(
	'/rolepermissions/:roleId/:permissionId',
	requireRole('Admin'),
	validatePositiveIntParam('roleId', 'roleId'),
	validatePositiveIntParam('permissionId', 'permissionId'),
	async (req, res, next) => {
		try {
			const roleId = req.validated?.roleId ?? Number(req.params.roleId);
			const permissionId = req.validated?.permissionId ?? Number(req.params.permissionId);
			const rolePermission = await rolePermissionController.FindRolePermissionById(roleId, permissionId);

			if (!rolePermission) {
				return res.status(404).json({ message: 'RolePermission khong ton tai.' });
			}

			return res.json(rolePermission);
		} catch (error) {
			return next(error);
		}
	}
);

router.post('/rolepermissions', requireRole('Admin'), async (req, res, next) => {
	try {
		const payload = req.body || {};
		const rolePermission = await rolePermissionController.CreateRolePermission(payload);
		return res.status(201).json(rolePermission);
	} catch (error) {
		return next(error);
	}
});

router.put(
	'/rolepermissions/:roleId/:permissionId',
	requireRole('Admin'),
	validatePositiveIntParam('roleId', 'roleId'),
	validatePositiveIntParam('permissionId', 'permissionId'),
	async (req, res, next) => {
		try {
			const roleId = req.validated?.roleId ?? Number(req.params.roleId);
			const permissionId = req.validated?.permissionId ?? Number(req.params.permissionId);
			const payload = req.body || {};
			const updatedRolePermission = await rolePermissionController.ModifyRolePermission(roleId, permissionId, payload);

			if (!updatedRolePermission) {
				return res.status(404).json({ message: 'RolePermission khong ton tai.' });
			}

			return res.json(updatedRolePermission);
		} catch (error) {
			return next(error);
		}
	}
);

router.delete(
	'/rolepermissions/:roleId/:permissionId',
	requireRole('Admin'),
	validatePositiveIntParam('roleId', 'roleId'),
	validatePositiveIntParam('permissionId', 'permissionId'),
	async (req, res, next) => {
		try {
			const roleId = req.validated?.roleId ?? Number(req.params.roleId);
			const permissionId = req.validated?.permissionId ?? Number(req.params.permissionId);
			const deletedCount = await rolePermissionController.DeleteRolePermission(roleId, permissionId);

			if (!deletedCount) {
				return res.status(404).json({ message: 'RolePermission khong ton tai.' });
			}

			return res.json({ message: 'Xoa role-permission thanh cong.' });
		} catch (error) {
			return next(error);
		}
	}
);

module.exports = router;