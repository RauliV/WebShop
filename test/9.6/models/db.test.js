const { expect } = require('chai');
const { getDbUrl } = require('../../../models/db');

describe('getDbUrl()', () => {
  let envBackup;

  beforeEach(() => {
    envBackup = process.env.DBURL;
  });

  afterEach(() => {
    delete process.env.DBURL;
    if (envBackup) process.env.DBURL = envBackup;
    envBackup = undefined;
  });

  it('must return default database URL if DBURL is not defined', () => {
    delete process.env.DBURL;
    expect(getDbUrl()).to.equal('mongodb://localhost:27017/WebShopDb');
  });

  it('must return DBURL defined in environment variable', () => {
    const dbUrl = 'mongodb://testhost.12345/dbName';
    process.env.DBURL = dbUrl;
    expect(getDbUrl()).to.equal(dbUrl);
  });
});
