const rolePermissionModel = require('../schema/rolePermissionModel');

exports.GetAllRolePermissions = async () => {
    return rolePermissionModel.getAllRolePermissions();
};

exports.FindRolePermissionById = async (roleId, permissionId) => {
    return rolePermissionModel.getRolePermissionById(roleId, permissionId);
};

exports.CreateRolePermission = async (payload) => {
    return rolePermissionModel.createRolePermission(payload);
};

exports.ModifyRolePermission = async (roleId, permissionId, payload) => {
    return rolePermissionModel.updateRolePermission(roleId, permissionId, payload);
};

exports.DeleteRolePermission = async (roleId, permissionId) => {
    return rolePermissionModel.deleteRolePermission(roleId, permissionId);
};