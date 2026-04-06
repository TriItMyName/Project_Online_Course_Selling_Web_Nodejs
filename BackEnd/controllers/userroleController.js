const userRoleModel = require('../schema/userroleModel');

exports.GetAllUserRoles = async () => {
    return userRoleModel.getAllUserRoles();
};

exports.FindUserRoleById = async (userId, roleId) => {
    return userRoleModel.getUserRoleById(userId, roleId);
};

exports.CreateUserRole = async (payload) => {
    return userRoleModel.createUserRole(payload);
};

exports.ModifyUserRole = async (userId, roleId, payload) => {
    return userRoleModel.updateUserRole(userId, roleId, payload);
};

exports.DeleteUserRole = async (userId, roleId) => {
    return userRoleModel.deleteUserRole(userId, roleId);
};