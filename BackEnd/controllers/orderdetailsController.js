const orderDetailModel = require('../schema/orderdetailsModel');

exports.GetAllOrderDetails = async () => {
    return orderDetailModel.getAllOrderDetails();
};

exports.FindOrderDetailById = async (id) => {
    return orderDetailModel.getOrderDetailById(id);
};

exports.CreateOrderDetail = async (payload) => {
    return orderDetailModel.createOrderDetail(payload);
};

exports.ModifyOrderDetail = async (id, payload) => {
    return orderDetailModel.updateOrderDetail(id, payload);
};

exports.DeleteOrderDetail = async (id) => {
    return orderDetailModel.deleteOrderDetail(id);
};

exports.FindOrderDetailsByOrderId = async (orderId) => {
    return orderDetailModel.getOrderDetailsByOrderId(orderId);
};
