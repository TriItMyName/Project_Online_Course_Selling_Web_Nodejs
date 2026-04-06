const roleModel = require('../schema/rolesModel');

exports.GetAllRoles = async () => {
    return roleModel.getAllRoles();
};

exports.FindRoleById = async (id) => {
    return roleModel.getRoleById(id);
};

exports.CreateARole = async (payload) => {
    return roleModel.createRole(payload);
};

exports.ModifyRole = async (id, payload) => {
    return roleModel.updateRole(id, payload);
};

exports.DeleteRole = async (id) => {
    return roleModel.deleteRole(id);
};
