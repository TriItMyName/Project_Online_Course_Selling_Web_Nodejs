const userModel = require('../schema/usersModel');

exports.GetAllUsers = async () => {
    return userModel.getAllUsers();
};

exports.FindUserById = async (id) => {
    return userModel.getUserById(id);
};

exports.CreateAnUser = async (payload) => {
    return userModel.createUser(payload);
};

exports.ModifyUser = async (id, payload) => {
    return userModel.updateUser(id, payload);
};

exports.DeleteUser = async (id) => {
    return userModel.deleteUser(id);
};