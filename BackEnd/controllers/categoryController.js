const categoryModel = require('../schema/categoryModel');

exports.GetAllCategories = async () => {
    return categoryModel.getAllCategories();
};

exports.FindCategoryById = async (id) => {
    return categoryModel.getCategoryById(id);
};

exports.CreateACategory = async (payload) => {
    return categoryModel.createCategory(payload);
};

exports.ModifyCategory = async (id, payload) => {
    return categoryModel.updateCategory(id, payload);
};

exports.DeleteCategory = async (id) => {
    return categoryModel.deleteCategory(id);
};