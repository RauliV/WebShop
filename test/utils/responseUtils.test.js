const chai = require('chai');
const { createResponse } = require('node-mocks-http');
const responseUtils = require('../../utils/responseUtils');
const expect = chai.expect;

describe('Response Utils', () => {
  describe('basicAuthChallenge()', () => {
    it('should set response status to 401', () => {
      const response = createResponse();
      responseUtils.basicAuthChallenge(response);
      expect(response.statusCode).to.equal(401);
    });

    it('should set response header "WWW-Authenticate" to "Basic"', () => {
      const response = createResponse();
      responseUtils.basicAuthChallenge(response);
      expect(response.hasHeader('www-authenticate')).to.be.true;
      expect(response.getHeader('www-authenticate')).to.equal('Basic');
    });
  });

  describe('sendJson()', () => {
    const payload = { a: 1, b: 2, c: 3 };

    it('should set response status to 200 by default', () => {
      const response = createResponse();
      responseUtils.sendJson(response, payload);
      expect(response.statusCode).to.equal(200);
    });

    it('should set response status to given value', () => {
      const response = createResponse();
      responseUtils.sendJson(response, payload, 201);
      expect(response.statusCode).to.equal(201);
    });

    it('should set response Content-Type to "application/json"', () => {
      const response = createResponse();
      responseUtils.sendJson(response, payload);
      expect(response.hasHeader('content-type')).to.be.true;
      expect(response.getHeader('content-type')).to.equal('application/json');
    });
  });

  describe('createdResource()', () => {
    const payload = { a: 1, b: 2, c: 3 };

    it('should set response status to 201', () => {
      const response = createResponse();
      responseUtils.createdResource(response, payload);
      expect(response.statusCode).to.equal(201);
    });

    it('should set response Content-Type to "application/json"', () => {
      const response = createResponse();
      responseUtils.createdResource(response, payload);
      expect(response.hasHeader('content-type')).to.be.true;
      expect(response.getHeader('content-type')).to.equal('application/json');
    });
  });

  describe('noContent()', () => {
    it('should set response status to 204', () => {
      const response = createResponse();
      responseUtils.noContent(response);
      expect(response.statusCode).to.equal(204);
    });
  });

  describe('badRequest()', () => {
    it('should set response status to 400', () => {
      const response = createResponse();
      responseUtils.badRequest(response);
      expect(response.statusCode).to.equal(400);
    });

    it('should set response Content-Type to "application/json" when error message is supplied', () => {
      const response = createResponse();
      responseUtils.badRequest(response, 'Error message');
      expect(response.hasHeader('content-type')).to.be.true;
      expect(response.getHeader('content-type')).to.equal('application/json');
    });
  });

  describe('unauthorized()', () => {
    it('should set response status to 401', () => {
      const response = createResponse();
      responseUtils.unauthorized(response);
      expect(response.statusCode).to.equal(401);
    });
  });

  describe('forbidden()', () => {
    it('should set response status to 403', () => {
      const response = createResponse();
      responseUtils.forbidden(response);
      expect(response.statusCode).to.equal(403);
    });
  });

  describe('notFound()', () => {
    it('should set response status to 404', () => {
      const response = createResponse();
      responseUtils.notFound(response);
      expect(response.statusCode).to.equal(404);
    });
  });

  describe('methodNotAllowed()', () => {
    it('should set response status to 405', () => {
      const response = createResponse();
      responseUtils.methodNotAllowed(response);
      expect(response.statusCode).to.equal(405);
    });
  });

  describe('contentTypeNotAcceptable()', () => {
    it('should set response status to 406', () => {
      const response = createResponse();
      responseUtils.contentTypeNotAcceptable(response);
      expect(response.statusCode).to.equal(406);
    });
  });

  describe('internalServerError()', () => {
    it('should set response status to 500', () => {
      const response = createResponse();
      responseUtils.internalServerError(response);
      expect(response.statusCode).to.equal(500);
    });
  });
});
