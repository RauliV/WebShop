const puppeteer = require('puppeteer');
const http = require('http');
const chai = require('chai');
const expect = chai.expect;
const chaiHttp = require('chai-http');
const { handleRequest } = require('../routes');
chai.use(chaiHttp);

const User = require('../models/user');
const Product = require('../models/product');

// helper function for authorization headers
const encodeCredentials = (username, password) =>
  Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');

// helper function for creating randomized test data
const generateRandomString = (len = 9) => {
  let str = '';

  do {
    str += Math.random().toString(36).substr(2, 9).trim();
  } while (str.length < len);

  return str.substr(0, len);
};

const shortWaitTime = 350;

// Get users (create copies for test isolation)
const users = require('../setup/users.json').map(user => ({...user }));

const adminUser = {...users.find(u => u.role === 'admin') };
const customerUser = {...users.find(u => u.role === 'customer') };

const notificationSelector = '#notifications-container';
const rowSelector = '.item-row';

// Get products
const products = require('../setup/products.json').map(product => ({...product }));

describe('User Inteface', () => {
  let allUsers;
  let allProducts;
  let baseUrl;
  let browser;
  let context;
  let page;
  let server;
  let registrationPage;
  let usersPage;
  let productsPage;
  let cartPage;

  const getHeaders = user => {
    return { Authorization: `Basic ${encodeCredentials(user.email, user.password)}` };
  };

  // get randomized test user
  const getTestUser = () => {
    return {
      name: generateRandomString(),
      email: `${generateRandomString()}@email.com`,
      password: generateRandomString(10)
    };
  };

  before(async() => {
    await Product.deleteMany({});
    await Product.create(products);
    allProducts = await Product.find({});

    server = http.createServer(handleRequest);
    server.listen(3000, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
    });
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    registrationPage = `${baseUrl}/register.html`;
    usersPage = `${baseUrl}/users.html`;
    productsPage = `${baseUrl}/products.html`;
    cartPage = `${baseUrl}/cart.html`;
  });

  after(() => {
    server && server.close();
    browser && browser.close();
  });

  beforeEach(async() => {
    await User.deleteMany({});
    await User.create(users);
    allUsers = await User.find({});
    page = await browser.newPage();
  });

  afterEach(async() => {
    page && (await page.close());
  });

  describe('UI: List all users', () => {
    beforeEach(async() => {
      // await page.authenticate({ username: adminUser.email, password: adminUser.password });
      await page.setExtraHTTPHeaders(getHeaders(adminUser));
    });

    it('should list all users when navigating to "/users.html"', async() => {
      await page.goto(usersPage);
      await page.waitForTimeout(shortWaitTime);

      const selector = '.item-row';
      const userElements = await page.$$(selector);

      const errorMsg =
        `Authenticated as ${adminUser.email} and navigated to "/users.html" ` +
        `Tried to locate all users with selector "${selector}" ` +
        `Expected to find ${allUsers.length} elements ` +
        `but found ${userElements.length} elements instead.`;

      expect(userElements.length).to.equal(allUsers.length, errorMsg);

      for (const user of allUsers) {
        const { id, name, email, role, password } = user;
        const nameText = await page.$eval(`#name-${id}`, elem => elem.textContent.trim());
        const emailText = await page.$eval(`#email-${id}`, elem => elem.textContent.trim());
        const roleText = await page.$eval(`#role-${id}`, elem => elem.textContent.trim());
        expect({
          _id: id,
          name: nameText,
          email: emailText,
          role: roleText,
          password
        }).to.include({ _id: id, name, email, password, role },
          `Name, email or role is incorrect for user: ${name} (id: ${id}, email: ${email}, role: ${role})`
        );
      }
    });
  });

  describe('UI: Register new user', () => {
    it('should create new user on successful registration', async() => {
      const newCustomer = getTestUser();

      const errorMsg =
        'Navigated to "/register.html" and tried to register following user: ' +
        `{ name: ${newCustomer.name}, email: ${newCustomer.email}, password: ${newCustomer.password} } ` +
        `and then navigated to ${usersPage} and expected to find a new user (h3 with text content of ${newCustomer.name}) ` +
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
      // await page.authenticate({ username: adminUser.email, password: adminUser.password });
      await page.setExtraHTTPHeaders(getHeaders(adminUser));
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
    beforeEach(async() => {
      // await page.authenticate({ username: adminUser.email, password: adminUser.password });
      await page.setExtraHTTPHeaders(getHeaders(adminUser));
    });

    it('should show correctly filled modification form', async() => {
      const customer = await User.findOne({ email: customerUser.email }).exec();
      const openButtonSelector = `#modify-${customer.id}`;
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

      const { id, name, email, role } = customer;
      const idText = await page.$eval('#id-input', elem => elem.value.trim());
      const nameText = await page.$eval('#name-input', elem => elem.value.trim());
      const emailText = await page.$eval('#email-input', elem => elem.value.trim());
      const roleText = await page.$eval('#role-input', elem => elem.value.trim());

      errorMsg =
        'Tried to get text content from modify user ' +
        'but could not find one or more of the elements. ' +
        'Make sure that all the necessary ids are present ' +
        'and that the modify user form appears when "Modify" button is pressed';

      expect({ _id: idText, name: nameText, email: emailText, role: roleText }).to.include({ _id: id, name, email, role },
        errorMsg
      );
    });

    it('should correctly modify user role', async() => {
      const customer = await User.findOne({ email: customerUser.email }).exec();
      const openButtonSelector = `#modify-${customer.id}`;
      const updateButtonSelector = '#update-button';
      const roleInputSelector = '#role-input';
      const notificationSelector = '#notifications-container';
      const expectedNotification = `Updated user ${customer.name}`;
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

      const roleText = await page.$eval(`#role-${customer.id}`, elem => elem.textContent.trim());

      errorMsg =
        'Tried change customer role to admin. ' +
        `Expected to see role "${selectValue}" for user ${customer.name} ` +
        `but found "${roleText}" instead.`;

      expect(roleText).to.equal(selectValue, errorMsg);
    });
  });

  describe('UI: Delete user', () => {
    beforeEach(async() => {
      // await page.authenticate({ username: adminUser.email, password: adminUser.password });
      await page.setExtraHTTPHeaders(getHeaders(adminUser));
    });

    it('should delete user correctly', async() => {
      const customer = await User.findOne({ email: customerUser.email }).exec();
      const { _id, name } = customer.toJSON();
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
      const userSelector = `#user-${_id}`;
      const userElement = await page.$(userSelector);
      const userElements = await page.$$(selector);

      errorMsg =
        'Navigated to "/users.html" ' +
        `and clicked delete for user "${name}". ` +
        `Expected to find ${allUsers.length - 1} users in the list but found ${
          userElements.length
        }. ` +
        'Are you deleting the user row from the UI after the API response?';

      expect(userElement).to.be.null;
      expect(userElements.length).to.equal(allUsers.length - 1, errorMsg);
    });
  });

  // Product UI tests
  describe('UI: List all products', () => {
    beforeEach(async() => {
      // await page.authenticate({ username: adminUser.email, password: adminUser.password });
      await page.setExtraHTTPHeaders(getHeaders(adminUser));
    });

    it('should list all products when navigating to "/products.html"', async() => {
      const productsData = JSON.parse(JSON.stringify(allProducts));
      await page.goto(productsPage);
      await page.waitForTimeout(shortWaitTime);

      const selector = '.item-row';
      const productElements = await page.$$(selector);

      const errorMsg =
        `Authenticated as ${adminUser.email} and navigated to "/products.html" ` +
        `Tried to locate all products with selector "${selector}" ` +
        `Expected to find ${productsData.length} elements ` +
        `but found ${productElements.length} elements instead.`;

      expect(productElements.length).to.equal(productsData.length, errorMsg);

      for (const product of productsData) {
        const nameText = await page.$eval(`#name-${product._id}`, elem => elem.textContent.trim());
        const descriptionText = await page.$eval(`#description-${product._id}`, elem =>
          elem.textContent.trim()
        );
        const priceText = await page.$eval(`#price-${product._id}`, elem =>
          elem.textContent.trim()
        );

        expect(nameText).to.equal(product.name);
        expect(descriptionText).to.equal(product.description);
        expect(Number.parseFloat(priceText)).to.equal(product.price);
      }
    });
  });

  describe('UI: Shopping cart', () => {
    beforeEach(async() => {
      // await page.authenticate({ username: customerUser.email, password: customerUser.password });
      await page.setExtraHTTPHeaders(getHeaders(customerUser));
    });

    it('should show a notification about adding a product to shopping cart', async() => {
      const product = allProducts[0];
      const addToCartSelector = `#add-to-cart-${product.id}`;
      const expectedText = `Added ${product.name} to cart!`;

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const addToCartButton = await page.$(addToCartSelector);

      let errorMsg =
        `Tried to add a product to the cart: ${product.name} ` +
        `Could not locate the add to cart button ${addToCartSelector} ` +
        'Make sure that the button has the correct id.';

      expect(addToCartButton, errorMsg).not.to.be.null;

      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);

      const notificationText = await page.$eval(notificationSelector, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Navigated to "/products.html" ' +
        `and clicked add product to shopping cart "${product.name}". ` +
        `Expected to receive a notification: "${expectedText}" ` +
        `but found this instead: "${notificationText}"`;

      expect(notificationText).to.equal(expectedText, errorMsg);
    });

    it('should show the product in shopping cart', async() => {
      const product = allProducts[0];
      const addToCartSelector = `#add-to-cart-${product.id}`;

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      let errorMsg =
        `Tried to add a product to the cart: ${product.name} ` +
        `Could not locate the add to cart button ${addToCartSelector} ` +
        'Make sure that the button has the correct id.';

      const addToCartButton = await page.$(addToCartSelector);
      expect(addToCartButton, errorMsg).not.to.be.null;

      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);

      await page.goto(cartPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const nameText = await page.$eval(`#name-${product.id}`, elem => elem.textContent.trim());
      const priceText = await page.$eval(`#price-${product.id}`, elem => elem.textContent.trim());
      const amountText = await page.$eval(`#amount-${product.id}`, elem => elem.textContent.trim());

      errorMsg =
        'Tried to get text content from the shopping cart ' +
        'but could not find one or more of the elements. ' +
        'Make sure that all the necessary ids are present ' +
        'and that the shopping cart page contents are correct';

      expect({
        name: nameText,
        price: Number.parseFloat(priceText),
        amount: amountText
      }).to.include({ name: product.name, price: product.price, amount: '1x' }, errorMsg);
    });

    it('should increase the amount of items of a product in a shopping cart', async() => {
      const product = allProducts[0];
      const addToCartSelector = `#add-to-cart-${product.id}`;

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      let errorMsg =
        `Tried to add a product to the cart: ${product.name} ` +
        `Could not locate the add to cart button ${addToCartSelector} ` +
        'Make sure that the button has the correct id.';

      const addToCartButton = await page.$(addToCartSelector);
      expect(addToCartButton, errorMsg).not.to.be.null;

      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);

      await page.goto(cartPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const plusButtonSelector = `#plus-${product.id}`;
      const increaseAmountButton = await page.$(plusButtonSelector);

      errorMsg =
        `Tried to increase the amount of a product in the cart: ${product.name} ` +
        `Could not locate the button ${plusButtonSelector} ` +
        'Make sure that the button has the correct id.';

      expect(increaseAmountButton, errorMsg).not.to.be.null;

      await page.click(plusButtonSelector);
      await page.waitForTimeout(shortWaitTime);

      const newAmountText = await page.$eval(`#amount-${product.id}`, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Tried to increase amount of ' +
        `"${product.name}". ` +
        'Expected amount text: "2x" ' +
        `but found this instead: "${newAmountText}"`;

      expect(newAmountText).to.equal('2x', errorMsg);
    });

    it('should decrease the amount of items of a product in a shopping cart', async() => {
      const product = allProducts[0];
      const addToCartSelector = `#add-to-cart-${product.id}`;

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const addToCartButton = await page.$(addToCartSelector);

      let errorMsg =
        `Tried to add a product to the cart: ${product.name} ` +
        `Could not locate the add to cart button ${addToCartSelector} ` +
        'Make sure that the button has the correct id.';

      expect(addToCartButton, errorMsg).not.to.be.null;

      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);

      await page.goto(cartPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const plusButtonSelector = `#plus-${product.id}`;
      const increaseAmountButton = await page.$(plusButtonSelector);

      errorMsg =
        `Tried to increase the amount of a product in the cart: ${product.name} ` +
        `Could not locate the button ${plusButtonSelector} ` +
        'Make sure that the button has the correct id.';

      expect(increaseAmountButton, errorMsg).not.to.be.null;

      await page.click(plusButtonSelector);
      await page.waitForTimeout(shortWaitTime);

      const minusButtonSelector = `#minus-${product.id}`;
      const decreaseAmountButton = await page.$(minusButtonSelector);

      errorMsg =
        `Tried to decrease the amount of a product in the cart: ${product.name} ` +
        `Could not locate the the button ${minusButtonSelector} ` +
        'Make sure that the button has the correct id.';

      expect(decreaseAmountButton, errorMsg).not.to.be.null;

      await page.click(minusButtonSelector);
      await page.waitForTimeout(shortWaitTime);

      const newAmountText = await page.$eval(`#amount-${product._id}`, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Tried to decrease amount of ' +
        `"${product.name}". ` +
        'Expected to amount text: "1x" ' +
        `but found this instead: "${newAmountText}"`;

      expect(newAmountText).to.equal('1x', errorMsg);
    });

    it('should remove item from shopping cart when amount decreases to 0', async() => {
      const product = allProducts[0];
      const addToCartSelector = `#add-to-cart-${product.id}`;

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const addToCartButton = await page.$(addToCartSelector);

      let errorMsg =
        `Tried to add a product to the cart: ${product.name} ` +
        `Could not locate the add to cart button ${addToCartSelector} ` +
        'Make sure that the button has the correct id.';

      expect(addToCartButton, errorMsg).not.to.be.null;

      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);

      await page.goto(cartPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const minusButtonSelector = `#minus-${product.id}`;
      const decreaseAmountButton = await page.$(minusButtonSelector);

      errorMsg =
        `Tried to decrease the amount of a product in the cart: ${product.name} ` +
        `Could not locate the the button ${minusButtonSelector} ` +
        'Make sure that the button has the correct id.';

      expect(decreaseAmountButton, errorMsg).not.to.be.null;

      await page.click(minusButtonSelector);
      await page.waitForTimeout(shortWaitTime);

      const cartContents = await page.$(rowSelector);
      await page.waitForTimeout(shortWaitTime);

      errorMsg =
        'Tried to decrease amount of ' +
        `"${product.name}" to 0. ` +
        'Expected it to be removed from the cart but cart was not empty';

      expect(cartContents).to.be.null;
    });

    it("should increase the amount in shopping cart with each click on product's page", async() => {
      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);
      const product = allProducts[0];
      const addToCartSelector = `#add-to-cart-${product.id}`;
      const expectedText = `Added ${product.name} to cart!`;

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const addToCartButton = await page.$(addToCartSelector);

      let errorMsg =
        `Tried to add a product to the cart: ${product.name} ` +
        `Could not locate the add to cart button ${addToCartSelector} ` +
        'Make sure that the button has the correct id.';

      expect(addToCartButton, errorMsg).not.to.be.null;

      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);
      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);
      await page.click(addToCartSelector);
      await page.waitForTimeout(shortWaitTime);

      const notificationText = await page.$eval(notificationSelector, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Navigated to "/products.html" ' +
        `and clicked add product to shopping cart three time for "${product.name}". ` +
        `Expected to receive a notification: "${expectedText}${expectedText}${expectedText}" ` +
        `but found this instead: "${notificationText}"`;

      expect(notificationText).to.equal(expectedText + expectedText + expectedText, errorMsg);

      await page.goto(cartPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const nameText = await page.$eval(`#name-${product.id}`, elem => elem.textContent.trim());
      const priceText = await page.$eval(`#price-${product.id}`, elem => elem.textContent.trim());
      const amountText = await page.$eval(`#amount-${product.id}`, elem => elem.textContent.trim());

      errorMsg =
        'Tried to get text content from the shopping cart ' +
        'but could not find one or more of the elements. ' +
        'Make sure that all the necessary ids are present ' +
        'and that the shopping cart page contents are correct';

      expect({
        name: nameText,
        price: Number.parseFloat(priceText),
        amount: amountText
      }).to.include({ name: product.name, price: product.price, amount: '3x' }, errorMsg);
    });

    it('should place order from the shopping cart', async() => {
      const product = allProducts[0];
      await page.goto(cartPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const expectedText = 'Succesfully created an order!';

      const buttonSelector = '#place-order-button';
      const sendOrderButton = await page.$(buttonSelector);

      let errorMsg =
        `Tried to place an order, but could not locate the button ${buttonSelector} ` +
        'Make sure that the button has the correct id.';

      expect(sendOrderButton, errorMsg).not.to.be.null;

      await page.click(buttonSelector);
      await page.waitForTimeout(shortWaitTime);

      const notificationText = await page.$eval(notificationSelector, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Navigated to "/products.html" ' +
        `and clicked add product to shopping cart "${product.name}". ` +
        `Expected to receive a notification: "${expectedText}" ` +
        `but found this instead: "${notificationText}"`;

      const cartContents = await page.$(rowSelector);
      await page.waitForTimeout(shortWaitTime);

      errorMsg =
        'The shopping cart should be empty after placing an order, but the cart was not empty';

      expect(cartContents).to.be.null;
    });

    it('should be able to add two different products to the shopping cart', async() => {
      const product1 = allProducts[0];
      const product2 = allProducts[2];

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);
      const addToCartSelector1 = `#add-to-cart-${product1.id}`;
      const addToCartSelector2 = `#add-to-cart-${product2.id}`;
      const expectedText1 = `Added ${product1.name} to cart!`;
      const expectedText2 = `Added ${product2.name} to cart!`;

      await page.goto(productsPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const addToCartButton1 = await page.$(addToCartSelector1);

      let errorMsg =
        `Tried to add a product to the cart: ${product1.name} ` +
        `Could not locate the add to cart button ${addToCartSelector1} ` +
        'Make sure that the button has the correct id.';

      expect(addToCartButton1, errorMsg).not.to.be.null;

      const addToCartButton2 = await page.$(addToCartSelector2);

      errorMsg =
        `Tried to add a product to the cart: ${product2.name} ` +
        `Could not locate the add to cart button ${addToCartSelector2} ` +
        'Make sure that the button has the correct id.';

      expect(addToCartButton2, errorMsg).not.to.be.null;

      await page.click(addToCartSelector1);
      await page.waitForTimeout(shortWaitTime);

      let notificationText = await page.$eval(notificationSelector, elem =>
        elem.textContent.trim()
      );

      errorMsg =
        'Navigated to "/products.html" ' +
        `and clicked add product to shopping cart "${product1.name}". ` +
        `Expected to receive a notification: "${expectedText1}" ` +
        `but found this instead: "${notificationText}"`;

      expect(notificationText).to.equal(expectedText1, errorMsg);

      await page.click(addToCartSelector2);
      await page.waitForTimeout(shortWaitTime);
      await page.click(addToCartSelector2);
      await page.waitForTimeout(shortWaitTime);

      notificationText = await page.$eval(notificationSelector, elem => elem.textContent.trim());

      errorMsg =
        'Navigated to "/products.html" ' +
        `and clicked add product to shopping cart "${product2.name}". ` +
        `Expected to receive a notification: "${expectedText2}" ` +
        `but found this instead: "${notificationText}"`;

      expect(notificationText).to.equal(expectedText1 + expectedText2 + expectedText2, errorMsg);

      // Here start the cart page handling
      await page.goto(cartPage, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(shortWaitTime);

      const amountText1 = await page.$eval(`#amount-${product1.id}`, elem =>
        elem.textContent.trim()
      );

      const amountText2 = await page.$eval(`#amount-${product2.id}`, elem =>
        elem.textContent.trim()
      );

      expect(amountText1).to.equal('1x', errorMsg);
      expect(amountText2).to.equal('2x', errorMsg);
    });
  });
});