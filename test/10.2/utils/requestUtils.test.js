const chai = require('chai');
const { createRequest } = require('node-mocks-http');
const {
  acceptsJson,
  getCredentials,
  isJson
} = require('../../../utils/requestUtils');
const expect = chai.expect;

// helper function for authorization headers
const encodeCredentials = (username, password) =>
  Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');

const getRequest = headers => createRequest({ headers });

// Get users (create copies for test isolation)
const users = require('../../../setup/users.json').map(user => ({ ...user }));
const adminUser = { ...users.find(u => u.role === 'admin') };
const adminCredentials = encodeCredentials(adminUser.email, adminUser.password);

describe('Request Utils', () => {
  // get headers for tests
  const getHeaders = () => {
    return {
      authorization: `Basic ${adminCredentials}`,
      accept:
        'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'content-type': 'application/json'
    };
  };

  describe('acceptsJson()', () => {
    it('should return false when "Accept" header is missing', () => {
      const headers = getHeaders();
      delete headers.accept;
      expect(acceptsJson(getRequest(headers))).to.be.false;
    });

    it('should return false when "Accept" header does not include "application/json" or "*/*"', () => {
      const headers = getHeaders();
      headers.accept = headers.accept
        .split(',')
        .filter(
          header =>
            !header.includes('application/json') && !header.includes('*/*')
        )
        .join(',');

      expect(acceptsJson(getRequest(headers))).to.be.false;
    });

    it('should return true when "Accept" header includes "application/json"', () => {
      const headers = getHeaders();
      headers.accept = headers.accept
        .split(',')
        .filter(header => !header.includes('*/*'))
        .join(',');

      expect(acceptsJson(getRequest(headers))).to.be.true;
    });

    it('should return true when "Accept" header includes "*/*"', () => {
      const headers = getHeaders();
      headers.accept = headers.accept
        .split(',')
        .filter(header => !header.includes('application/json'))
        .join(',');

      expect(acceptsJson(getRequest(headers))).to.be.true;
    });
  });

  describe('getCredentials()', () => {
    it('should return null when "Authorization" header is missing', () => {
      const headers = getHeaders();
      delete headers.authorization;
      expect(getCredentials(getRequest(headers))).to.be.null;
    });

    it('should return null when "Authorization" header is empty', () => {
      const headers = getHeaders();
      headers.authorization = '';
      expect(getCredentials(getRequest(headers))).to.be.null;
    });

    it('should return null when "Authorization" type is not "Basic"', () => {
      const headers = getHeaders();
      headers.authorization = headers.authorization.replace('Basic', 'Bearer');
      expect(getCredentials(getRequest(headers))).to.be.null;
    });

    it('should return Array when "Authorization" type is "Basic"', () => {
      const headers = getHeaders();
      expect(getCredentials(getRequest(headers))).to.be.an('array');
    });

    it('should return parsed credentials in an Array when "Authorization" header is correct', () => {
      const headers = getHeaders();
      const credentials = getCredentials(getRequest(headers));
      expect(credentials).to.be.an('array');
      expect(credentials[0]).to.equal(adminUser.email);
      expect(credentials[1]).to.equal(adminUser.password);
    });
  });

  describe('isJson()', () => {
    it('should return false when "Content-Type" header is missing', () => {
      const headers = getHeaders();
      delete headers['content-type'];
      expect(isJson(getRequest(headers))).to.be.false;
    });

    it('should return false when "Content-Type" header is empty', () => {
      const headers = getHeaders();
      headers['content-type'] = '';
      expect(isJson(getRequest(headers))).to.be.false;
    });

    it('should return false when "Content-Type" is not "application/json', () => {
      const headers = getHeaders();
      headers['content-type'] = 'application/x-www-form-urlencoded';
      expect(isJson(getRequest(headers))).to.be.false;
    });

    it('should return true when "Content-Type" is "application/json', () => {
      const headers = getHeaders();
      expect(isJson(getRequest(headers))).to.be.true;
    });
  });
});
