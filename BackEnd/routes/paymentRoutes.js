const express = require('express');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post('/payment/momo/create', paymentController.createMomoPayment);
router.get('/payment/momo/callback', paymentController.momoCallback);
router.post('/payment/momo/ipn', paymentController.momoIpn);
router.post('/payment/momo/callback', paymentController.momoIpn);

module.exports = router;
