const express = require('express');
const router = express.Router();
const orderController = require('../controllers/ordersController');
const { validatePositiveIntParam } = require('../utils/validator');
const {
	emitOrderCreated,
	emitOrderUpdated,
	emitOrderDeleted,
} = require('../utils/socket');

router.get('/orders', async (_req, res, next) => {
	try {
		const orders = await orderController.GetAllOrders();
		return res.json(orders);
	} catch (error) {
		return next(error);
	}
});

router.get('/orders/user/:userId', validatePositiveIntParam('userId', 'userId'), async (req, res, next) => {
	try {
		const userId = req.validated?.userId ?? Number(req.params.userId);
		const orders = await orderController.FindOrdersByUserId(userId);
		return res.json(orders);
	} catch (error) {
		return next(error);
	}
});

router.get('/orders/filter', async (req, res, next) => {
	try {
		const filters = {
			status: req.query.status,
			keyword: req.query.keyword,
			timeStart: req.query.timeStart,
			timeEnd: req.query.timeEnd,
		};
		const orders = await orderController.FilterOrders(filters);
		return res.json(orders);
	} catch (error) {
		return next(error);
	}
});

router.get('/orders/processed/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const userId = req.validated?.id ?? Number(req.params.id);
		const orders = await orderController.FindProcessedOrders(userId);
		return res.json(orders);
	} catch (error) {
		return next(error);
	}
});

router.get('/orders/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const order = await orderController.FindOrderById(id);

		if (!order) {
			return res.status(404).json({ message: 'Don hang khong ton tai.' });
		}

		return res.json(order);
	} catch (error) {
		return next(error);
	}
});

router.post('/orders', async (req, res, next) => {
	try {
		const payload = req.body || {};
		const order = await orderController.CreateOrder(payload);
		emitOrderCreated(order);
		return res.status(201).json(order);
	} catch (error) {
		return next(error);
	}
});

router.put('/orders/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedOrder = await orderController.ModifyOrder(id, payload);

		if (!updatedOrder) {
			return res.status(404).json({ message: 'Don hang khong ton tai.' });
		}

		emitOrderUpdated(updatedOrder);
		return res.json(updatedOrder);
	} catch (error) {
		return next(error);
	}
});

router.delete('/orders/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const existingOrder = await orderController.FindOrderById(id);
		const deletedCount = await orderController.DeleteOrder(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Don hang khong ton tai.' });
		}

		emitOrderDeleted({
			id,
			order: existingOrder || null,
		});
		return res.json({ message: 'Xoa don hang thanh cong.' });
	} catch (error) {
		return next(error);
	}
});

router.get('/orders-with-users', async (_req, res, next) => {
	try {
		const orders = await orderController.GetAllOrdersWithUserName();
		return res.json(orders);
	} catch (error) {
		return next(error);
	}
});

router.get('/orders-with-user/:id', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const order = await orderController.GetOrderWithUserNameById(id);

		if (!order) {
			return res.status(404).json({ message: 'Don hang khong ton tai.' });
		}

		return res.json(order);
	} catch (error) {
		return next(error);
	}
});

router.put('/orders/:id/status', validatePositiveIntParam('id', 'id'), async (req, res, next) => {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const status = req.body?.status ?? req.body?.Status;
		if (status == null || String(status).trim() === '') {
			return res.status(400).json({ message: 'status la bat buoc.' });
		}

		const updatedOrder = await orderController.ModifyOrder(id, { status });
		if (!updatedOrder) {
			return res.status(404).json({ message: 'Don hang khong ton tai.' });
		}

		emitOrderUpdated(updatedOrder);
		return res.json(updatedOrder);
	} catch (error) {
		return next(error);
	}
});

module.exports = router;