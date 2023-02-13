const chai = require('chai');
const expect = chai.expect;

const User = require('../../../models/user');

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

const createTestString = (strLength = 9, character = 'a') => {
  return new Array(strLength + 1).join(character);
};

// get randomized test data
const getTestData = () => {
  return {
    name: generateRandomString(),
    email: `${generateRandomString()}@email.com`,
    password: generateRandomString(10),
    role: 'admin'
  };
};

describe('User Model', () => {
  describe('Schema validation', () => {
    it('must define "name"', () => {
      const data = getTestData();
      delete data.name;

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must trim spaces from "name"', () => {
      const data = getTestData();
      data.name = `  ${data.name}  `;

      const user = new User(data);
      expect(user.name).to.equal(data.name.trim());
    });

    it('must not allow "name" to have only spaces', () => {
      const data = getTestData();
      data.name = '     ';

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must require "name" to be at least one character long', () => {
      const data = getTestData();
      data.name = '';

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must not allow "name" to be longer than 50 characters', () => {
      const data = getTestData();
      data.name = createTestString(51);

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must require "email"', () => {
      const data = getTestData();
      delete data.email;

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must require "email" to be valid email address', () => {
      const data = getTestData();
      data.email = generateRandomString();

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must require "password"', () => {
      const data = getTestData();
      delete data.password;

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must not allow empty "password"', () => {
      const data = getTestData();
      data.password = '';

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });

    it('must require password to be at least 10 characters long', () => {
      const data = getTestData();
      data.password = generateRandomString(9);

      let user = new User(data);
      let error = user.validateSync();
      expect(error).to.exist;

      data.password = generateRandomString(10);
      user = new User(data);
      error = user.validateSync();
      expect(error).to.be.undefined;
    });

    it('must hash password', () => {
      const data = getTestData();

      const user = new User(data);
      expect(user.password).to.not.equal(data.password);
      expect(user.password).to.match(/^\$2a\$10\$.{53}$/);
      expect(user.password).to.be.lengthOf(60);
    });

    it('must hash "password" when set to a new value', () => {
      const data = getTestData();
      const password = generateRandomString(11);

      const user = new User(data);
      user.password = password;
      expect(user.password).to.not.equal(password);
      expect(user.password).to.match(/^\$2a\$10\$.{53}$/);
      expect(user.password).to.be.lengthOf(60);
    });

    it('has an optional "role"', () => {
      const data = getTestData();
      delete data.role;

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.be.undefined;
    });

    it('must set default value of "role" to customer', () => {
      const data = getTestData();
      delete data.role;

      const user = new User(data);
      expect(user.role).to.equal('customer');
    });

    it('must allow any known "role"', () => {
      const data = getTestData()

      ;['admin', 'customer'].forEach(role => {
        data.role = role;
        const user = new User(data);
        const error = user.validateSync();
        expect(error).to.be.undefined;
      });
    });

    it('must trim "role"', () => {
      const data = getTestData();
      data.role = `  ${data.role}  `;

      const user = new User(data);
      expect(user.role).to.equal(data.role.trim());
    });

    it('must cast "role" to lowercase', () => {
      const data = getTestData();
      data.role = data.role.toUpperCase();

      const user = new User(data);
      expect(user.role).to.equal(data.role.toLowerCase());
    });

    it('must not allow unknown "role"', () => {
      const data = getTestData();
      data.role = generateRandomString();

      const user = new User(data);
      const error = user.validateSync();
      expect(error).to.exist;
    });
  });

  describe('checkPassword()', () => {
    it('must detect correct "password"', async () => {
      const data = getTestData();
      const user = new User(data);
      const isPasswordCorrect = await user.checkPassword(data.password);
      expect(isPasswordCorrect).to.be.true;
    });

    it('must detect a false "password"', async () => {
      const data = getTestData();
      const user = new User(data);
      const isPasswordCorrect = await user.checkPassword(generateRandomString());
      expect(isPasswordCorrect).to.be.false;
    });
  });
});
