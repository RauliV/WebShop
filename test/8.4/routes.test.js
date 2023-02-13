const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const { handleRequest } = require('../../routes');
const { resetUsers } = require('../../utils/users');

const registrationUrl = '/api/register';
const usersUrl = '/api/users';
const contentType = 'application/json';
chai.use(chaiHttp);


// helper function for authorization headers
const encodeCredentials = (username, password) =>
  Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');


// helper function for creating randomized test data
const generateRandomString = (len = 9) => {
  return Math.random().toString(36).substr(2, len);
};

// Get users (create copies for test isolation)
const users = require('../../users.json').map(user => ({ ...user }));
const adminUser = { ...users.find(u => u.role === 'admin') };
const adminCredentials = encodeCredentials(adminUser.email, adminUser.password);


const unknownUrls = [`/${generateRandomString(20)}.html`, `/api/${generateRandomString(20)}`];

describe('Routes', () => {
  // get randomized test user
  const getTestUser = () => {
    return {
      name: 'Name',
      email: `${generateRandomString()}@email.com`,
      password: generateRandomString(10)
    };
  };

  beforeEach(() => resetUsers());

  describe('handleRequest()', () => {
    describe('General Server Functionality', () => {
      it('should respond with "404 Not Found" to an unknown URI', async () => {
        for (const url of unknownUrls) {
          const response = await chai.request(handleRequest).get(url);
          expect(response).to.have.status(404);
        }
      });

      it('should respond with HTML file when "/register.html" is requested', async () => {
        const response = await chai.request(handleRequest).get('/register.html');
        expect(response).to.have.status(200);
        expect(response).to.be.html;
      });

      it('should respond with "204 No Content" to an OPTIONS request', async () => {
        const response = await chai.request(handleRequest).options(usersUrl);
        expect(response).to.have.status(204);
      });

      it('should respond with correct Allow headers to an OPTIONS request', async () => {
        const response = await chai.request(handleRequest).options(usersUrl);

        // Access-Control-Allow-Methods: GET
        expect(response).to.have.header('access-control-allow-methods', /get/i);

        // Access-Control-Allow-Headers: Content-Type,Accept
        expect(response).to.have.header('access-control-allow-headers', /content-type,accept/i);

        // Access-Control-Max-Age: 86400
        expect(response).to.have.header('access-control-max-age', '86400');

        // Access-Control-Expose-Headers: Content-Type,Accept
        expect(response).to.have.header('access-control-expose-headers', /content-type,accept/i);
      });
    });

    describe('Registration: POST /api/register', () => {
      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const user = getTestUser();
        const response = await chai.request(handleRequest).post(registrationUrl).send(user);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const user = getTestUser();
        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', 'text/html')
          .send(user);
        expect(response).to.have.status(406);
      });

      it('should respond with "400 Bad Request" when request body is not valid JSON', async () => {
        const body = JSON.stringify(getTestUser()).substring(1);
        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(body);
        expect(response).to.have.status(400);
      });

      it('should respond with "400 Bad Request" when email is missing', async () => {
        const user = getTestUser();
        delete user.email;

        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(user);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when email is already in use', async () => {
        const user = getTestUser();
        user.email = adminUser.email;

        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(user);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when name is missing', async () => {
        const user = getTestUser();
        delete user.name;

        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(user);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when password is missing', async () => {
        const user = getTestUser();
        delete user.password;

        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(user);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "201 Created" when registration is successful', async () => {
        const user = getTestUser();

        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(user);

        expect(response).to.have.status(201);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      });

      it('should set user role to "customer" when registration is successful', async () => {
        const user = getTestUser();
        user.role = 'admin';

        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(user);

        expect(response).to.have.status(201);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
        expect(response.body.role).to.equal('customer');
      });
    });
    describe('Viewing all users: GET /api/users', () => {
      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai.request(handleRequest).get(usersUrl);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai.request(handleRequest).get(usersUrl).set('Accept', 'text/html');

        expect(response).to.have.status(406);
      });

      it('should respond with JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('array');
      });
    });
  });
});
