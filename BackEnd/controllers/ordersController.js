const orderModel = require('../schema/ordersModel');

exports.GetAllOrders = async () => {
    return orderModel.getAllOrders();
};

exports.FindOrdersByUserId = async (userId) => {
    return orderModel.getOrdersByUserId(userId);
};

exports.FilterOrders = async (filters) => {
    return orderModel.filterOrders(filters);
};

exports.FindProcessedOrders = async (userId) => {
    return orderModel.getProcessedOrders(userId);
};

exports.FindOrderById = async (id) => {
    return orderModel.getOrderById(id);
};

exports.CreateOrder = async (payload) => {
    return orderModel.createOrder(payload);
};

exports.ModifyOrder = async (id, payload) => {
    return orderModel.updateOrder(id, payload);
};

exports.DeleteOrder = async (id) => {
    return orderModel.deleteOrder(id);
};

exports.GetAllOrdersWithUserName = async () => {
    return orderModel.getAllOrdersWithUserName();
};

exports.GetOrderWithUserNameById = async (id) => {
    return orderModel.getOrderWithUserNameById(id);
};

exports.ModifyOrderStatus = async (id, status) => {
    return orderModel.updateOrderStatus(id, status);
};