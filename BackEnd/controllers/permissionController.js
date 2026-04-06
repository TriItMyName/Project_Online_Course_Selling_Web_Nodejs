const permissionModel = require('../schema/permissionModel');

exports.GetAllPermissions = async () => {
    return permissionModel.getAllPermissions();
};

exports.FindPermissionById = async (id) => {
    return permissionModel.getPermissionById(id);
};

exports.CreateAPermission = async (payload) => {
    return permissionModel.createPermission(payload);
};

exports.ModifyPermission = async (id, payload) => {
    return permissionModel.updatePermission(id, payload);
};

exports.DeletePermission = async (id) => {
    return permissionModel.deletePermission(id);
};