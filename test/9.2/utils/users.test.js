const chai = require('chai');
const expect = chai.expect;
const {
  deleteUserById,
  emailInUse,
  getAllUsers,
  getUser,
  getUserById,
  resetUsers,
  saveNewUser,
  updateUserRole,
  validateUser
} = require('../../../utils/users');

// helper function for creating randomized test data
const generateRandomString = (len = 9) => {
  let str = '';

  do {
    str += Math.random().toString(36).substr(2, 9).trim();
  } while (str.length < len);

  return str.substr(0, len);
};

// Get users (create copies for test isolation)
const users = require('../../../users.json').map(user => ({ ...user }));

const adminUser = { ...users.find(u => u.role === 'admin') };
const customerUser = { ...users.find(u => u.role === 'customer') };

describe('usersUtils', () => {
  // get randomized test user
  const getTestUser = () => {
    return {
      name: 'Name',
      email: `${generateRandomString()}@email.com`,
      password: generateRandomString()
    };
  };

  beforeEach(() => resetUsers());

  describe('emailInUse()', () => {
    it('should return true if email is already in use', () => {
      expect(emailInUse(adminUser.email)).to.be.true;
    });

    it('should return false if email is not in use', () => {
      const email = getTestUser().email;
      expect(emailInUse(email)).to.be.false;
    });
  });

  describe('getAllUsers()', () => {
    it('should return array of users', () => {
      const allUsers = getAllUsers();
      expect(allUsers).to.be.an('array');
      expect(allUsers).to.deep.include(adminUser);
      expect(allUsers).to.deep.include(customerUser);
    });

    it('should return copies of users', () => {
      const allUsers1 = getAllUsers();
      const allUsers2 = getAllUsers();

      expect(allUsers1).to.be.an('array');
      expect(allUsers1[0]).to.include(adminUser);
      expect(allUsers1[1]).to.include(customerUser);

      expect(allUsers2).to.be.an('array');
      expect(allUsers2[0]).to.include(adminUser);
      expect(allUsers2[1]).to.include(customerUser);

      expect(allUsers1[0]).to.not.equal(allUsers2[0]);
      expect(allUsers1[1]).to.not.equal(allUsers2[1]);
    });
  });

  describe('getUser()', () => {
    it('should return undefined if email is not found', () => {
      const email = getTestUser().email;
      expect(getUser(email, adminUser.password)).to.be.undefined;
    });

    it('should return undefined if email and password combination does match any user', () => {
      const { email, password } = getTestUser();
      expect(getUser(email, password)).to.be.undefined;
    });

    it('should return user object when email and password match', () => {
      const foundUser = getUser(adminUser.email, adminUser.password);
      expect(foundUser).to.be.an('object');
      expect(foundUser).to.include(adminUser);
    });

    it('should return a copy of the matching user', () => {
      const foundUser1 = getUser(adminUser.email, adminUser.password);
      const foundUser2 = getUser(adminUser.email, adminUser.password);

      expect(foundUser1).to.be.an('object');
      expect(foundUser1).to.include(adminUser);
      expect(foundUser2).to.be.an('object');
      expect(foundUser2).to.include(adminUser);
      expect(foundUser1).to.not.equal(foundUser2);
    });
  });

  describe('getUserById()', () => {
    it('should return undefined if ID is not found', () => {
      const id = generateRandomString(10);
      expect(getUserById(id)).to.be.undefined;
    });

    it('should return user object when ID matches', () => {
      const foundUser = getUserById(adminUser._id);
      expect(foundUser).to.be.an('object');
      expect(foundUser._id).to.equal(adminUser._id);
    });

    it('should return a copy of the matching user', () => {
      const foundUser1 = getUserById(adminUser._id);
      const foundUser2 = getUserById(adminUser._id);
      expect(foundUser1).to.be.an('object');
      expect(foundUser1).to.include(adminUser);
      expect(foundUser2).to.be.an('object');
      expect(foundUser2).to.include(adminUser);
      expect(foundUser1).to.not.equal(foundUser2);
    });
  });

  describe('saveNewUser()', () => {
    it('should save the new user', () => {
      const newUser = getTestUser();
      newUser.role = 'customer';
      saveNewUser(newUser);

      const createdUser = getUser(newUser.email, newUser.password);
      expect(createdUser).to.be.an('object');
      expect(createdUser).to.include(newUser);
    });

    it('should add "_id" to the saved user', () => {
      const newUser = getTestUser();
      newUser.role = 'customer';
      saveNewUser(newUser);

      const createdUser = getUser(newUser.email, newUser.password);
      expect(createdUser).to.be.an('object');
      expect(createdUser).to.have.property('_id');
    });

    it('should set role to "customer" when role is missing', () => {
      const newUser = getTestUser();
      delete newUser.role;
      saveNewUser(newUser);

      const createdUser = getUser(newUser.email, newUser.password);
      expect(createdUser).to.be.an('object');
      expect(createdUser.role).to.equal('customer');
    });

    it('should save a copy of the user and not the original', () => {
      const newUser = getTestUser();
      saveNewUser(newUser);

      // change after saving to see whether this also changes the saved user
      // if saved object is not a copy this will also change the saved object
      newUser.role = generateRandomString(10);

      const createdUser = getUser(newUser.email, newUser.password);
      expect(createdUser).to.be.an('object');
      expect(createdUser.role).to.not.equal(newUser.role);
    });

    it('should return a copy of the user created', () => {
      const newUser = getTestUser();
      const createdUser = saveNewUser(newUser);

      // change after saving to see whether this also changes the saved user
      // if saved object is not a copy this will also change the saved object
      newUser.role = generateRandomString(10);

      expect(createdUser).to.be.an('object');
      expect(createdUser).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      expect(createdUser.role).to.not.equal(newUser.role);
    });
  });

  describe('deleteUserById()', () => {
    it('should return undefined if user is not found', () => {
      const userId = generateRandomString(10);
      expect(deleteUserById(userId)).to.be.undefined;
    });

    it('should delete an existing user with the given ID', () => {
      const allUsers1 = getAllUsers();
      const userId = allUsers1[allUsers1.length - 1]._id;
      deleteUserById(userId);

      // fetch users after deletion
      const allUsers2 = getAllUsers();

      expect(allUsers1.length > allUsers2.length).to.be.true;
      expect(allUsers2.some(u => u._id === userId)).to.be.false;
    });

    it('should return the deleted user object', () => {
      const allUsers = getAllUsers();
      const userId = allUsers[allUsers.length - 1]._id;
      const deletedUser = deleteUserById(userId);
      expect(deletedUser).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      expect(deletedUser._id).to.equal(userId);
    });
  });

  describe('updateUserRole()', () => {
    it('should return undefined if user does not exist', () => {
      const userId = generateRandomString(10);
      const role = 'customer';
      expect(updateUserRole(userId, role)).to.be.undefined;
    });

    it('should throw and error if role is unknown', () => {
      const userId = customerUser._id;
      const role = generateRandomString();
      expect(() => updateUserRole(userId, role)).to.throw('Unknown role');
    });

    it('should update role of an existing user', () => {
      const user = users.find(u => u.role === 'customer' && u.name === 'Customer3');
      updateUserRole(user._id, 'admin');
      const updatedUser = getUserById(user._id);

      expect(updatedUser).to.be.an('object');
      expect(updatedUser).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      expect(updatedUser.role).to.equal('admin');
    });

    it('should return a copy of the updated user', () => {
      const user = users.find(u => u.role === 'admin' && u.name === 'Admin3');
      const updatedUser1 = updateUserRole(user._id, 'customer');
      const updatedUser2 = updateUserRole(user._id, 'admin');

      expect(updatedUser1).to.be.an('object');
      expect(updatedUser1).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      expect(updatedUser1.role).to.equal('customer');
      expect(updatedUser2).to.be.an('object');
      expect(updatedUser2).to.have.all.keys('_id', 'name', 'email', 'password', 'role');
      expect(updatedUser2.role).to.equal('admin');
      expect(updatedUser1).to.not.equal(updatedUser2);
    });
  });

  describe('validateUser()', () => {
    it('should return array of error messages when user is invalid', () => {
      const user = getTestUser();
      user.role = 'customer';
      delete user.name;
      expect(validateUser(user)).to.be.an('array');
    });

    it('should return "Missing email" when "email" is missing', () => {
      const user = getTestUser();
      user.role = 'customer';
      delete user.email;
      expect(validateUser(user)).to.be.an('array').that.includes('Missing email');
    });

    it('should return "Missing password" when "password" is missing', () => {
      const user = getTestUser();
      user.role = 'customer';
      delete user.password;
      expect(validateUser(user)).to.be.an('array').that.includes('Missing password');
    });

    it('should return "Missing name" when "name" is missing', () => {
      const user = getTestUser();
      user.role = 'customer';
      delete user.name;
      expect(validateUser(user)).to.be.an('array').that.includes('Missing name');
    });

    it('should return "Unknown role" when role is unknown', () => {
      const user = getTestUser();
      user.role = generateRandomString();
      expect(validateUser(user)).to.be.an('array').that.includes('Unknown role');
    });

    it('should allow user with missing role (return empty array)', () => {
      const user = getTestUser();
      delete user.role;
      expect(validateUser(user)).to.be.an('array').that.is.empty;
    });

    it('should allow user with role "admin" (return empty array)', () => {
      const user = { ...adminUser };
      expect(validateUser(user)).to.be.an('array').that.is.empty;
    });

    it('should allow user with role "customer" (return empty array)', () => {
      const user = { ...customerUser };
      expect(validateUser(user)).to.be.an('array').that.is.empty;
    });
  });
});
