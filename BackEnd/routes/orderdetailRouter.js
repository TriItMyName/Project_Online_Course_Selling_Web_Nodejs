const express = require('express');
const router = express.Router();
const orderDetailController = require('../controllers/orderdetailsController');
const { validatePositiveIntParam } = require('../utils/validator');

async function getAllOrderDetailsHandler(_req, res, next) {
	try {
		const details = await orderDetailController.GetAllOrderDetails();
		return res.json(details);
	} catch (error) {
		return next(error);
	}
}

async function getOrderDetailsByOrderIdHandler(req, res, next) {
	try {
		const orderId = req.validated?.id ?? Number(req.params.id);
		const details = await orderDetailController.FindOrderDetailsByOrderId(orderId);
		return res.json(details);
	} catch (error) {
		return next(error);
	}
}

async function getOrderDetailByIdHandler(req, res, next) {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const detail = await orderDetailController.FindOrderDetailById(id);

		if (!detail) {
			return res.status(404).json({ message: 'Chi tiet don hang khong ton tai.' });
		}

		return res.json(detail);
	} catch (error) {
		return next(error);
	}
}

async function createOrderDetailHandler(req, res, next) {
	try {
		const payload = req.body || {};
		const detail = await orderDetailController.CreateOrderDetail(payload);
		return res.status(201).json(detail);
	} catch (error) {
		return next(error);
	}
}

async function updateOrderDetailHandler(req, res, next) {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const payload = req.body || {};
		const updatedDetail = await orderDetailController.ModifyOrderDetail(id, payload);

		if (!updatedDetail) {
			return res.status(404).json({ message: 'Chi tiet don hang khong ton tai.' });
		}

		return res.json(updatedDetail);
	} catch (error) {
		return next(error);
	}
}

async function deleteOrderDetailHandler(req, res, next) {
	try {
		const id = req.validated?.id ?? Number(req.params.id);
		const deletedCount = await orderDetailController.DeleteOrderDetail(id);

		if (!deletedCount) {
			return res.status(404).json({ message: 'Chi tiet don hang khong ton tai.' });
		}

		return res.json({ message: 'Xoa chi tiet don hang thanh cong.' });
	} catch (error) {
		return next(error);
	}
}

router.get('/orderdetail', getAllOrderDetailsHandler);
router.get('/order-details', getAllOrderDetailsHandler);

router.get('/orderdetail/order/:id', validatePositiveIntParam('id', 'id'), getOrderDetailsByOrderIdHandler);
router.get('/order-details/order/:id', validatePositiveIntParam('id', 'id'), getOrderDetailsByOrderIdHandler);

router.get('/orderdetail/:id', validatePositiveIntParam('id', 'id'), getOrderDetailByIdHandler);
router.get('/order-details/:id', validatePositiveIntParam('id', 'id'), getOrderDetailByIdHandler);

router.post('/orderdetail', createOrderDetailHandler);
router.post('/order-details', createOrderDetailHandler);

router.put('/orderdetail/:id', validatePositiveIntParam('id', 'id'), updateOrderDetailHandler);
router.put('/order-details/:id', validatePositiveIntParam('id', 'id'), updateOrderDetailHandler);

router.delete('/orderdetail/:id', validatePositiveIntParam('id', 'id'), deleteOrderDetailHandler);
router.delete('/order-details/:id', validatePositiveIntParam('id', 'id'), deleteOrderDetailHandler);

module.exports = router;