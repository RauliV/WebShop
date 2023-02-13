const chai = require('chai');
const expect = chai.expect;
const { createResponse } = require('node-mocks-http');
const { getAllProducts } = require('../../controllers/products');
const Product = require('../../models/product');

// Get products (create copies for test isolation)
const originalProducts = require('../../setup/products.json').map(product => ({ ...product }));

describe('Products Controller', () => {
  let products;

  beforeEach(async () => {
    // reset database
    await Product.deleteMany({});
    await Product.create(originalProducts);
    const foundProducts = await Product.find({});
    products = foundProducts.map(product => JSON.parse(JSON.stringify(product)));
  });

  describe('getAllProducts()', () => {
    it('should respond with JSON', async () => {
      const response = createResponse();
      await getAllProducts(response);

      expect(response.statusCode).to.equal(200);
      expect(response.getHeader('content-type')).to.equal('application/json');
      expect(response._isJSON()).to.be.true;
      expect(response._isEndCalled()).to.be.true;
      expect(response._getJSONData()).to.be.an('array');
      expect(response._getJSONData()).to.be.deep.equal(products);
    });
  });
});
