const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const { handleRequest } = require('../routes');

const registrationUrl = '/api/register';
const usersUrl = '/api/users';
const productsUrl = '/api/products';
const ordersUrl = '/api/orders';
const contentType = 'application/json';
chai.use(chaiHttp);

const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');

// helper function for authorization headers
const encodeCredentials = (username, password) =>
  Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');

// helper function for creating randomized test data
const generateRandomString = (len = 9) => {
  let str = '';

  do {
    str += Math.random()
      .toString(36)
      .substr(2, 9)
      .trim();
  } while (str.length < len);

  return str.substr(0, len);
};

// Get products (create copies for test isolation)
const products = require('../setup/products.json').map(product => ({ ...product }));

// Get users (create copies for test isolation)
const users = require('../setup/users.json').map(user => ({ ...user }));

const adminUser = { ...users.find(u => u.role === 'admin') };
const customerUser = { ...users.find(u => u.role === 'customer') };

const adminCredentials = encodeCredentials(adminUser.email, adminUser.password);
const customerCredentials = encodeCredentials(customerUser.email, customerUser.password);
const invalidCredentials = encodeCredentials(adminUser.email, customerUser.password);

const unknownUrls = [`/${generateRandomString(20)}.html`, `/api/${generateRandomString(20)}`];

describe('Routes', () => {
  let allUsers;
  let allProducts;
  let allOrders;

  // get randomized test user
  const getTestUser = () => {
    return {
      name: generateRandomString(),
      email: `${generateRandomString()}@email.com`,
      password: generateRandomString(10)
    };
  };

  const getTestProduct = () => {
    return {
      name: generateRandomString(),
      price: Math.floor(Math.random() * 50000) / 100,
      image: `http://www.images.com/${generateRandomString()}.jpg`,
      description: generateRandomString(75)
    };
  };

  const getTestOrder = () => {
    return {
      items: [
        {
          product: {
            _id: allProducts[1].id,
            name: allProducts[1].name,
            price: allProducts[1].price,
            description: allProducts[1].description
          },
          quantity: Math.floor(Math.random() * 5) + 1
        }
      ]
    };
  };

  beforeEach(async () => {
    await User.deleteMany({});
    await User.create(users);
    allUsers = await User.find({});

    await Product.deleteMany({});
    await Product.create(products);
    allProducts = await Product.find({});

    const orders = allUsers.map(user => {
      return {
        customerId: user.id,
        items: [
          {
            product: {
              _id: allProducts[0].id,
              name: allProducts[0].name,
              price: allProducts[0].price,
              description: allProducts[0].description
            },
            quantity: Math.floor(Math.random() * 5) + 1
          }
        ]
      };
    });

    await Order.deleteMany({});
    await Order.create(orders);
    allOrders = await Order.find({});
  });

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

      it('should respond with "405 Method Not Allowed" to an unsupported method', async () => {
        const response = await chai
          .request(handleRequest)
          .post(usersUrl)
          .set('Accept', contentType)
          .send({});
        expect(response).to.have.status(405);
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
        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .send(user);
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

        const createdUser = await User.findOne({ email: user.email }).exec();
        const { id, name, email, role, password } = createdUser;

        expect(response).to.have.status(201);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
        expect(response.body).to.include({ _id: id, name, email, role, password });
      });

      it('should set user role to "customer" when registration is successful', async () => {
        const user = getTestUser();
        user.role = 'admin';

        const response = await chai
          .request(handleRequest)
          .post(registrationUrl)
          .set('Accept', contentType)
          .send(user);

        const createdUser = await User.findOne({ email: user.email }).exec();

        expect(response).to.have.status(201);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
        expect(response.body.role).to.equal('customer');
        expect(createdUser.role).to.equal('customer');
      });
    });

    describe('Viewing all users: GET /api/users', () => {
      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai.request(handleRequest).get(usersUrl);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', 'text/html');

        expect(response).to.have.status(406);
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization header is empty', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', contentType)
          .set('Authorization', '');

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization header is not properly encoded', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminUser.email}:${adminUser.password}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(usersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(403);
      });

      it('should respond with JSON when admin credentials are received', async () => {
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

    describe('Viewing a single user: GET /api/users/{id}', () => {
      let testUser;
      let url;
      let unknownId;

      beforeEach(async () => {
        const tempUser = users.find(u => u.role === 'admin' && u.email !== adminUser.email);
        testUser = await User.findOne({ email: tempUser.email }).exec();
        url = `${usersUrl}/${testUser.id}`;
        unknownId = testUser.id
          .split('')
          .reverse()
          .join('');
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(403);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with JSON when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      });

      it('should respond with status code 404 when user does not exist', async () => {
        const response = await chai
          .request(handleRequest)
          .get(`${usersUrl}/${unknownId}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(404);
      });
    });

    describe('Updating users: PUT /api/users/{id}', () => {
      const user = {
        role: 'admin'
      };

      let testUser;
      let url;
      let unknownId;

      beforeEach(async () => {
        const tempUser = users.find(u => u.role === 'customer' && u.email !== customerUser.email);
        testUser = await User.findOne({ email: tempUser.email }).exec();
        url = `${usersUrl}/${testUser.id}`;
        unknownId = testUser.id
          .split('')
          .reverse()
          .join('');
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai.request(handleRequest).put(url);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(user);

        expect(response).to.have.status(403);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(user);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(user);
        expect(response).to.have.status(406);
      });

      it('should update role when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(user);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
        expect(response.body.role).to.equal('admin');
      });

      it('should only update role', async () => {
        const userWithExtra = {
          _id: generateRandomString(24),
          ...getTestUser(),
          role: 'customer'
        };

        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(userWithExtra);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
        expect(response.body.email).to.equal(testUser.email);
        expect(response.body.name).to.equal(testUser.name);
        expect(response.body._id).to.equal(testUser.id);
        expect(response.body.role).to.equal('customer');
      });

      it('should respond with "400 Bad Request" when role is missing', async () => {
        const userWithExtra = {
          _id: generateRandomString(),
          ...getTestUser()
        };

        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(userWithExtra);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when role is not valid', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send({ role: generateRandomString() });

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with status code 404 when user does not exist', async () => {
        const response = await chai
          .request(handleRequest)
          .put(`${usersUrl}/${unknownId}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(user);

        expect(response).to.have.status(404);
      });
    });

    describe('Deleting users: DELETE /api/users/{id}', () => {
      let testUser;
      let url;
      let unknownId;

      beforeEach(async () => {
        const tempUser = users[users.length - 1];
        testUser = await User.findOne({ email: tempUser.email }).exec();
        url = `${usersUrl}/${testUser.id}`;
        unknownId = testUser.id
          .split('')
          .reverse()
          .join('');
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(403);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should delete user when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        const dbUsers = await User.find({});
        expect(response).to.have.status(200);
        expect(dbUsers).to.be.lengthOf(allUsers.length - 1);
      });

      it('should return the deleted user', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        const dbUsers = await User.find({});
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(dbUsers).to.be.lengthOf(allUsers.length - 1);
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      });

      it('should respond with status code 404 when user does not exist', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(`${usersUrl}/${unknownId}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(404);
      });
    });

    /**
     *  Products endpoints
     */
    describe('Viewing all products: GET /api/products', () => {
      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization header is empty', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', '');

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization header is not properly encoded', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminUser.email}:${adminUser.password}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai.request(handleRequest).get(productsUrl);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', 'text/html');

        expect(response).to.have.status(406);
      });

      it('should respond with JSON when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('array');
      });

      it('should respond with JSON when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('array');
      });

      it('should respond with correct data when admin credentials are received', async () => {
        const productsData = JSON.parse(JSON.stringify(allProducts));
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.deep.equal(productsData);
      });

      it('should respond with correct data when customer credentials are received', async () => {
        const productsData = JSON.parse(JSON.stringify(allProducts));
        const response = await chai
          .request(handleRequest)
          .get(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.deep.equal(productsData);
      });
    });

    describe('Viewing a single product: GET /api/products/{id}', () => {
      let testProduct;
      let url;
      let unknownId;

      beforeEach(async () => {
        testProduct = await Product.findOne({}).exec();
        url = `${productsUrl}/${testProduct.id}`;
        unknownId = testProduct.id
          .split('')
          .reverse()
          .join('');
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with JSON when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'price', 'description', 'image');
      });

      it('should respond with JSON when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'price', 'description', 'image');
      });

      it('should respond with status code 404 when product does not exist', async () => {
        const response = await chai
          .request(handleRequest)
          .get(`${productsUrl}/${unknownId}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(404);
      });
    });

    describe('Updating products: PUT /api/products/{id}', () => {
      const product = {
        name: 'Test Product',
        price: 45.75,
        image: 'http://www.google.com/',
        description: 'A mysterious test product'
      };

      let testProduct;
      let url;
      let unknownId;

      beforeEach(async () => {
        testProduct = await Product.findOne({}).exec();
        url = `${productsUrl}/${testProduct.id}`;
        unknownId = testProduct.id
          .split('')
          .reverse()
          .join('');
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai.request(handleRequest).put(url);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(product);

        expect(response).to.have.status(403);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);
        expect(response).to.have.status(406);
      });

      it('should update product when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'description', 'image', 'price');
        expect(response.body._id).to.equal(testProduct.id);
        expect(response.body.name).to.equal(product.name);
        expect(response.body.description).to.equal(product.description);
        expect(response.body.image).to.equal(product.image);
        expect(response.body.price).to.equal(product.price);
      });

      it('should allow partial update of product properties', async () => {
        const productWithPartialData = { ...product };
        delete productWithPartialData.description;
        delete productWithPartialData.image;

        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(productWithPartialData);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'description', 'image', 'price');
        expect(response.body._id).to.equal(testProduct.id);
        expect(response.body.description).to.equal(testProduct.description);
        expect(response.body.image).to.equal(testProduct.image);
        expect(response.body.name).to.equal(product.name);
        expect(response.body.price).to.equal(product.price);
      });

      it('should respond with "400 Bad Request" when name is empty', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send({ name: '' });

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when price is not a number', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send({ price: generateRandomString() });

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when price is 0 (zero)', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send({ price: 0 });

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when price is negative', async () => {
        const response = await chai
          .request(handleRequest)
          .put(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send({ price: -2.5 });

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with status code 404 when product does not exist', async () => {
        const response = await chai
          .request(handleRequest)
          .put(`${productsUrl}/${unknownId}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);

        expect(response).to.have.status(404);
      });
    });

    describe('Deleting products: DELETE /api/products/{id}', () => {
      let testProduct;
      let url;
      let unknownId;

      beforeEach(async () => {
        testProduct = await Product.findOne({}).exec();
        url = `${productsUrl}/${testProduct.id}`;
        unknownId = testProduct.id
          .split('')
          .reverse()
          .join('');
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(403);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should delete product when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        const dbProducts = await Product.find({});
        expect(response).to.have.status(200);
        expect(dbProducts).to.be.lengthOf(allProducts.length - 1);
      });

      it('should return the deleted user', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        const dbProducts = await Product.find({});
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(dbProducts).to.be.lengthOf(allProducts.length - 1);
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'price', 'image', 'description');
      });

      it('should respond with status code 404 when user does not exist', async () => {
        const response = await chai
          .request(handleRequest)
          .delete(`${productsUrl}/${unknownId}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(404);
      });
    });

    describe('Create a new product: POST /api/products', () => {
      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const product = getTestProduct();
        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const product = getTestProduct();
        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);
        expect(response).to.have.status(406);
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const product = getTestProduct();
        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .send(product);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const product = getTestProduct();
        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .send(product);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const product = getTestProduct();
        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`)
          .send(product);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when customer credentials are received', async () => {
        const product = getTestProduct();
        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(product);

        expect(response).to.have.status(403);
      });

      it('should respond with "400 Bad Request" when request body is not valid JSON', async () => {
        const body = JSON.stringify(getTestProduct()).substring(1);
        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(body);
        expect(response).to.have.status(400);
      });

      it('should respond with "400 Bad Request" when name is missing', async () => {
        const product = getTestProduct();
        delete product.name;

        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when price is missing', async () => {
        const product = getTestProduct();
        delete product.price;

        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "201 Created" when product creation is successful', async () => {
        const product = getTestProduct();

        const response = await chai
          .request(handleRequest)
          .post(productsUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(product);

        const createdProduct = await Product.findOne({
          name: product.name,
          image: product.image
        }).exec();

        const { name, price, image, description } = createdProduct;
        expect(response).to.have.status(201);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.all.keys('_id', 'name', 'price', 'description', 'image');
        expect(response.body).to.include({
          _id: createdProduct.id,
          name,
          price,
          image,
          description
        });
      });
    });

    /**
     *  Orders endpoints
     */
    describe('Viewing all orders: GET /api/orders', () => {
      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization header is empty', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', '');

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization header is not properly encoded', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminUser.email}:${adminUser.password}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai.request(handleRequest).get(ordersUrl);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', 'text/html');

        expect(response).to.have.status(406);
      });

      it('should respond with JSON when admin credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('array');
      });

      it('should respond with JSON when customer credentials are received', async () => {
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('array');
      });

      it('should respond with correct data when admin credentials are received', async () => {
        const ordersData = JSON.parse(JSON.stringify(allOrders));
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.deep.equal(ordersData);
      });

      it('should respond with correct data when customer credentials are received', async () => {
        const customer = allUsers.find(
          user => user.email === customerUser.email && user.role === 'customer'
        );
        const ordersData = JSON.parse(
          JSON.stringify(allOrders.filter(order => order.customerId.toString() === customer.id))
        );
        const response = await chai
          .request(handleRequest)
          .get(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.deep.equal(ordersData);
      });
    });

    describe('Viewing a single order: GET /api/orders/{id}', () => {
      let testOrder;
      let url;
      let unknownId;

      beforeEach(async () => {
        const customer = allUsers.find(
          user => user.email === customerUser.email && user.role === 'customer'
        );
        testOrder = await Order.findOne({ customerId: customer._id }).exec();
        url = `${ordersUrl}/${testOrder.id}`;
        unknownId = testOrder.id
          .split('')
          .reverse()
          .join('');
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${adminCredentials}`);
        expect(response).to.have.status(406);
      });

      it('should respond with JSON when admin credentials are received', async () => {
        const orderData = JSON.parse(JSON.stringify(testOrder));
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.deep.equal(orderData);
      });

      it('should respond with JSON when customer credentials are received', async () => {
        const orderData = JSON.parse(JSON.stringify(testOrder));
        const response = await chai
          .request(handleRequest)
          .get(url)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(200);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.deep.equal(orderData);
      });

      it('should respond with status code 404 when order does not exist', async () => {
        const response = await chai
          .request(handleRequest)
          .get(`${ordersUrl}/${unknownId}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`);

        expect(response).to.have.status(404);
      });

      it('should respond with status code 404 when order exists but the owner is not the current customer', async () => {
        const order = allOrders.find(
          order => order.customerId.toString() !== testOrder.customerId.toString()
        );
        const response = await chai
          .request(handleRequest)
          .get(`${ordersUrl}/${order.id}`)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`);

        expect(response).to.have.status(404);
      });
    });

    describe('Create a new order: POST /api/orders', () => {
      it('should respond with "406 Not Acceptable" when Accept header is missing', async () => {
        const order = getTestOrder();
        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);
        expect(response).to.have.status(406);
      });

      it('should respond with "406 Not Acceptable" when client does not accept JSON', async () => {
        const order = getTestOrder();
        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', 'text/html')
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);
        expect(response).to.have.status(406);
      });

      it('should respond with "401 Unauthorized" when Authorization header is missing', async () => {
        const order = getTestOrder();
        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .send(order);

        expect(response).to.have.status(401);
      });

      it('should respond with Basic Auth Challenge when Authorization header is missing', async () => {
        const order = getTestOrder();
        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .send(order);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with Basic Auth Challenge when Authorization credentials are incorrect', async () => {
        const order = getTestOrder();
        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${invalidCredentials}`)
          .send(order);

        expect(response).to.have.status(401);
        expect(response).to.have.header('www-authenticate', /basic/i);
      });

      it('should respond with "403 Forbidden" when admin credentials are received', async () => {
        const order = getTestOrder();
        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${adminCredentials}`)
          .send(order);

        expect(response).to.have.status(403);
      });

      it('should respond with "400 Bad Request" when request body is not valid JSON', async () => {
        const body = JSON.stringify(getTestOrder()).substring(1);
        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(body);
        expect(response).to.have.status(400);
      });

      it('should respond with "400 Bad Request" when items is empty', async () => {
        const order = getTestOrder();
        order.items = [];

        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when quantity is missing', async () => {
        const order = getTestOrder();
        delete order.items[0].quantity;

        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when product is missing', async () => {
        const order = getTestOrder();
        delete order.items[0].product;

        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when product _id is missing', async () => {
        const order = getTestOrder();
        delete order.items[0].product._id;

        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when product name is missing', async () => {
        const order = getTestOrder();
        delete order.items[0].product.name;

        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "400 Bad Request" when price is missing', async () => {
        const order = getTestOrder();
        delete order.items[0].product.price;

        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);

        expect(response).to.have.status(400);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('error');
      });

      it('should respond with "201 Created" when order creation is successful', async () => {
        const order = getTestOrder();

        const response = await chai
          .request(handleRequest)
          .post(ordersUrl)
          .set('Accept', contentType)
          .set('Authorization', `Basic ${customerCredentials}`)
          .send(order);

        const orders = await Order.find({}).exec();
        const createdOrder = orders.find(o => o.id === response.body._id);
        const orderData = JSON.parse(JSON.stringify(createdOrder));

        expect(response).to.have.status(201);
        expect(response).to.be.json;
        expect(response.body).to.be.an('object');
        expect(createdOrder).to.not.be.null;
        expect(createdOrder).to.be.an('object');
        expect(response.body).to.deep.equal(orderData);
      });
    });
  });
});
