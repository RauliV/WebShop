/*const responseUtils = require("./utils/responseUtils");
const Product = require('../../models/product');
/**
 * Send all products as JSON
 *
 * @param {http.ServerResponse} response
 */
/*
const getAllProducts = async response => {
  const foundProducts = await Product.find({});
  const products = foundProducts.map(product => JSON.parse(JSON.stringify(product)));
  return responseUtils.sendJson(response, products);
};

module.exports = { getAllProducts };*/