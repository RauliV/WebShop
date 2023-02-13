const chai = require('chai');
const expect = chai.expect;
const { createResponse } = require('node-mocks-http');
const { getAllProducts } = require('../../../controllers/products');

// Get products (create copies for test isolation)
const products = require('../../../products.json').map(product => ({
  ...product
}));

describe('Products Controller', () => {
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
