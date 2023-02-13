const puppeteer = require('puppeteer');
const http = require('http');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const { handleRequest } = require('../../routes');
const { resetUsers } = require('../../utils/users');
chai.use(chaiHttp);

// helper function for creating randomized test data
const generateRandomString = (len = 9) => {
  return Math.random().toString(36).substr(2, len);
};

const shortWaitTime = 200;

// Get users (create copies for test isolation)
const users = require('../../users.json').map(user => ({ ...user }));
const adminUser = { ...users.find(u => u.role === 'admin') };

describe('User Inteface', () => {
  let baseUrl;
  let browser;
  let page;
  let server;
  let registrationPage;
  let usersPage;
  // get randomized test user
  const getTestUser = () => {
    return {
      name: 'Name',
      email: `${generateRandomString()}@email.com`,
      password: generateRandomString(10)
    };
  };

  before(async () => {
    server = http.createServer(handleRequest);
    server.listen(3000, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
    });
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });
    page = await browser.newPage();

    registrationPage = `${baseUrl}/register.html`;
    usersPage = `${baseUrl}/users.html`;
  });

  after(() => {
    server && server.close();
    browser && browser.close();
  });

  beforeEach(async () => {
    resetUsers();
    await page.authenticate({ username: adminUser.email, password: adminUser.password });
  });

  describe('UI: List all users', () => {
    it('should list all users when navigating to "/users.html"', async () => {
      await page.goto(usersPage);
      await page.waitForTimeout(shortWaitTime);

      const selector = '.item-row';
      const userElements = await page.$$(selector);

      const errorMsg =
        'Navigated to "/users.html" ' +
        `Tried to locate all users with selector "${selector}" ` +
        `Expected to find ${users.length} elements ` +
        `but found ${userElements.length} elements instead.`;

      expect(userElements.length).to.equal(userElements.length, errorMsg);

      for (const user of users) {
        const { _id: id, name, email, role, password } = user;
        const nameText = await page.$eval(`#name-${id}`, elem => elem.textContent.trim());
        const emailText = await page.$eval(`#email-${id}`, elem => elem.textContent.trim());
        const roleText = await page.$eval(`#role-${id}`, elem => elem.textContent.trim());
        expect({
          _id: id,
          name: nameText,
          email: emailText,
          role: roleText,
          password
        }).to.include(
          user,
          `Name, email or role is incorrect for user: ${name} (id: ${id}, email: ${email}, role: ${role})`
        );
      }
    });
  });

  describe('UI: Register new user', () => {
    it('should create new user on successful registration', async () => {
      const newCustomer = getTestUser();

      const errorsMsg =
        'Navigated to "/register.html" and tried to register following user: ' +
        `{ name: ${newCustomer.name}, email: ${newCustomer.email}, password: ${newCustomer.password} } ` +
        `and then navigated to ${usersPage} and expected to find a new user (h3 with text content of ${newCustomer.name})` +
        'however it could not be found.';

      await page.goto(registrationPage, { waitUntil: 'networkidle0' });

      // register a new customer
      await page.type('#name', newCustomer.name, { delay: 20 });
      await page.type('#email', newCustomer.email, { delay: 20 });
      await page.type('#password', newCustomer.password, { delay: 20 });
      await page.type('#passwordConfirmation', newCustomer.password, { delay: 20 });
      await page.click('#btnRegister');
      await page.waitForTimeout(shortWaitTime);

      // navigate to "/users.html" and check to see if the new user can be found
      await page.goto(usersPage, { waitUntil: 'networkidle0' });
      const nameElement = await page.$x(`//h3[contains(., '${newCustomer.name}')]`);
      let nameText = '';

      try {
        nameText = await (await nameElement[0].getProperty('textContent')).jsonValue();
      } catch (error) {}

      expect(nameText.trim()).to.equal(newCustomer.name.trim(), errorsMsg);
    });
  });
});
