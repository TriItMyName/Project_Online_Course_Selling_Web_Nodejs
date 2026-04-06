const express = require('express');
const userController = require('../controllers/userController');
const {
	validatedResult,
	CreateUserValidator,
	ModifyUserValidator,
	validateUserIdParam,
} = require('../utils/validator');

const router = express.Router();

router.get('/users', async (req, res, next) => {
	try {
		const users = await userController.GetAllUsers();
		return res.json(users);
	} catch (error) {
		return next(error);
	}
});

router.get('/users/:id', validateUserIdParam, async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const user = await userController.FindUserById(id);

		if (!user) {
			return res.status(404).json({ message: 'User khong ton tai.' });
		}

		return res.json(user);
	} catch (error) {
		return next(error);
	}
});

router.post('/users', CreateUserValidator, validatedResult, async (req, res, next) => {
	try {
		const payload = req.validated?.body || req.body;
		const newUser = await userController.CreateAnUser(payload);
		return res.status(201).json(newUser);
	} catch (error) {
		return next(error);
	}
});

router.put('/users/:id', validateUserIdParam, ModifyUserValidator, validatedResult, async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.validated?.body || req.body;
		const updatedUser = await userController.ModifyUser(id, payload);

		if (!updatedUser) {
			return res.status(404).json({ message: 'User khong ton tai.' });
		}

		return res.json(updatedUser);
	} catch (error) {
		return next(error);
	}
});

router.delete('/users/:id', validateUserIdParam, async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await userController.DeleteUser(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'User khong ton tai.' });
		}

		return res.json({ message: 'Xoa user thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;