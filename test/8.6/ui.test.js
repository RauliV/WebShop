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
  return Math.random()
    .toString(36)
    .substr(2, len);
};

const shortWaitTime = 200;

// Get users (create copies for test isolation)
const users = require('../../users.json').map(user => ({ ...user }));
const adminUser = { ...users.find(u => u.role === 'admin') };
const customerUser = { ...users.find(u => u.role === 'customer') };

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
        `Authenticated as ${adminUser.email} and navigated to "/users.html" ` +
        `Tried to locate all users with selector "${selector}" ` +
        `Expected to find ${users.length} elements ` +
        `but found ${userElements.length} elements instead.`;

      expect(userElements.length).to.equal(users.length, errorMsg);

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

      const errorMsg =
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

      expect(nameText.trim()).to.equal(newCustomer.name.trim(), errorMsg);
    });
  });

  describe('UI: Modify user', () => {
    it('should show correctly filled modification form', async () => {
      const openButtonSelector = `#modify-${customerUser._id}`;
      const updateButtonSelector = '#update-button';

      try {
        await page.goto(usersPage, { waitUntil: 'networkidle0' });
        await page.click(openButtonSelector);
        await page.waitForTimeout(shortWaitTime);
      } catch (error) {}

      const updateButton = await page.$(updateButtonSelector);
      let errorMsg =
        `Tried to modify user: ${customerUser.name} ` +
        `Could not either locate the element ${openButtonSelector} ` +
        `or update button ${updateButtonSelector}`;

      expect(updateButton, errorMsg).not.to.be.null;

      const { _id, name, email, role } = customerUser;
      const idText = await page.$eval('#id-input', elem => elem.value.trim());
      const nameText = await page.$eval('#name-input', elem => elem.value.trim());
      const emailText = await page.$eval('#email-input', elem => elem.value.trim());
      const roleText = await page.$eval('#role-input', elem => elem.value.trim());

      errorMsg =
        'Tried to get text content from modify user ' +
        'but could not find one or more of the elements. ' +
        'Make sure that all the necessary ids are present ' +
        'and that the modify user form appears when "Modify" button is pressed';

      expect({ _id: idText, name: nameText, email: emailText, role: roleText }).to.include(
        { _id, name, email, role },
        errorMsg
      );
    });

    it('should correctly modify user role', async () => {
      const openButtonSelector = `#modify-${customerUser._id}`;
      const updateButtonSelector = '#update-button';
      const roleInputSelector = '#role-input';
      const notificationSelector = '#notifications-container';
      const expectedNotification = `Updated user ${customerUser.name}`;
      const selectValue = 'admin';
      let errorMsg;

      await page.goto(usersPage, { waitUntil: 'networkidle0' });
      await page.click(openButtonSelector);
      await page.waitForTimeout(shortWaitTime);
      await page.select(roleInputSelector, selectValue);
      await page.click(updateButtonSelector);
      await page.waitForTimeout(shortWaitTime);

      const notificationText = await page.$eval(notificationSelector, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        `Opened modify form for "${customerUser.name}" ` +
        `and then clicked on "${roleInputSelector}" and selected "${selectValue}" and clicked "${updateButtonSelector}" ` +
        `waited for ${shortWaitTime}ms and expected to see a notification: "${expectedNotification}" `;

      if (notificationText) {
        errorMsg += `but instead found this notification: "${notificationText}"`;
      } else {
        errorMsg += `but did not find a notification text from element: "${notificationSelector}"`;
      }

      expect(notificationText).to.equal(expectedNotification, errorMsg);

      const roleText = await page.$eval(`#role-${customerUser._id}`, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Tried change customer role to admin. ' +
        `Expected to see role "${selectValue}" for user ${customerUser.name} ` +
        `but found "${roleText}" instead.`;

      expect(roleText).to.equal(selectValue, errorMsg);
    });
  });

  describe('UI: Delete user', () => {
    it('should delete user correctly', async () => {
      const { _id, name } = customerUser;
      const expectedNotification = `Deleted user ${name}`;
      const deleteSelector = `#delete-${_id}`;
      const notificationSelector = '#notifications-container';

      await page.goto(usersPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const deleteButton = await page.$(deleteSelector);

      let errorMsg =
        `Tried to delete user: ${name} ` +
        `Could not locate the delete button ${deleteSelector} ` +
        'Make sure the delete button has correct id.';

      expect(deleteButton, errorMsg).not.to.be.null;

      await page.click(deleteSelector);
      await page.waitForTimeout(shortWaitTime);

      const notificationText = await page.$eval(notificationSelector, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Navigated to "/users.html" ' +
        `and clicked delete for user "${name}". ` +
        `Expected to receive a notification: "${expectedNotification}" ` +
        `but found this instead: "${notificationText}"`;

      expect(notificationText).to.equal(expectedNotification, errorMsg);

      const selector = '.item-row';
      const userElements = await page.$$(selector);

      errorMsg =
        'Navigated to "/users.html" ' +
        `and clicked delete for user "${name}". ` +
        `Expected to find ${users.length - 1} users in the list but found ${
          userElements.length
        }. ` +
        'Are you deleting the user row from the UI after the API response?';

      expect(userElements.length).to.equal(users.length - 1, errorMsg);
    });
  });
});
