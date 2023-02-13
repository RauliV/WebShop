const path = require('path');
const dotEnvPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: dotEnvPath });

const { connectDB, disconnectDB } = require('../models/db');
const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');

const getRandom = (max, previous = null) => {
  const i = Math.floor(Math.random() * max);
  return previous === i ? getRandom(max, previous) : i;
};

(async () => {
  connectDB();
  const allCustomers = await User.find({ role: 'customer' }).exec();
  const allProducts = await Product.find({});

  const orders = allCustomers.map(customer => {
    const i = getRandom(allProducts.length);
    const products = [allProducts[i], allProducts[getRandom(allProducts.length, i)]].map(
      product => ({
        _id:  product.id,
        name: product.name,
        price: product.price,
        description: product.description
      })
    );

    return {
      customerId: customer.id,
      items: products.map(product => ({ product, quantity: getRandom(10) + 1 }))
    };
  });

  await Order.create(orders);
  console.log(`Created one order for each customer. Total of ${orders.length} orders.`);
  disconnectDB();
})();
