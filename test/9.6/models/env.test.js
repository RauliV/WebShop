const path = require('path');
const dotEnvPath = path.resolve(__dirname, '../../../.env');
require('dotenv').config({ path: dotEnvPath });
const { expect } = require('chai');

describe('.env', () => {
  it('must define DBURL', () => {
    expect(process.env).to.have.property('DBURL');
    expect(process.env.DBURL).to.be.a('string');
    expect(process.env.DBURL).to.match(/^mongodb:\/\/.+/);
  });
});
