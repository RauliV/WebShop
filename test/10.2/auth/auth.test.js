const chai = require('chai');
const expect = chai.expect;
const { createRequest } = require('node-mocks-http');
const { getCurrentUser } = require('../../../auth/auth');

const User = require('../../../models/user');

// helper function for authorization headers
const encodeCredentials = (username, password) =>
  Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');

const getRequest = headers => createRequest({ headers });

// Get users (create copies for test isolation)
const users = require('../../../setup/users.json').map(user => ({ ...user }));
const adminUser = { ...users.find(u => u.role === 'admin') };
const adminCredentials = encodeCredentials(adminUser.email, adminUser.password);

describe('Auth', () => {
  let admin;

  // get headers for tests
  const getHeaders = () => {
    return {
      authorization: `Basic ${adminCredentials}`
    };
  };

  before(async () => {
    await User.deleteMany({});
    await User.create(users);
    admin = await User.findOne({ email: adminUser.email }).exec();
  });

  describe('getCurrentUser()', () => {
    it('should return null when "Authorization" header is missing', async () => {
      const headers = getHeaders();
      delete headers.authorization;
      const user = await getCurrentUser(getRequest(headers));
      expect(user).to.be.null;
    });

    it('should return null when "Authorization" header is empty', async () => {
      const headers = getHeaders();
      headers.authorization = '';
      const user = await getCurrentUser(getRequest(headers));
      expect(user).to.be.null;
    });

    it('should return null when "Authorization" type is not "Basic"', async () => {
      const headers = getHeaders();
      headers.authorization = headers.authorization.replace('Basic', 'Bearer');
      const user = await getCurrentUser(getRequest(headers));
      expect(user).to.be.null;
    });

    it('should return null when user does not exist', async () => {
      const headers = getHeaders();
      headers.authorization = `Basic ${encodeCredentials(
        adminUser.password,
        adminUser.password
      )}`;
      const user = await getCurrentUser(getRequest(headers));
      expect(user).to.be.null;
    });

    it('should return null when password is incorrect', async () => {
      const headers = getHeaders();
      headers.authorization = `Basic ${encodeCredentials(
        adminUser.email,
        adminUser.email
      )}`;
      const user = await getCurrentUser(getRequest(headers));
      expect(user).to.be.null;
    });

    it('should return user object when credentials are correct', async () => {
      const headers = getHeaders();
      const user = await getCurrentUser(getRequest(headers));
      expect(user).to.be.an('object');
      expect(user.id).to.equal(admin.id);
      expect(user.name).to.equal(admin.name);
      expect(user.email).to.equal(admin.email);
      expect(user.role).to.equal(admin.role);
      expect(user.password).to.equal(admin.password);
    });
  });
});
