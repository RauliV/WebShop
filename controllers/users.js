/**
 * Send all users as JSON
 *
 * @param {object} response outgoing server response
 */
const getAllUsers = async response => {
  // TODO: 10.2 Implement this
  throw new Error('Not Implemented');
};

/**
 * Delete user and send deleted user as JSON
 *
 * @param {object} response outgoing server response
 * @param {string} userId id of the user to be deleted
 * @param {object} currentUser (mongoose document object)
 */
const deleteUser = async(response, userId, currentUser) => {
  // TODO: 10.2 Implement this
  throw new Error('Not Implemented');
};

/**
 * Update user and send updated user as JSON
 *
 * @param {object} response outgoing server response
 * @param {string} userId id of the user to be updated
 * @param {object} currentUser (mongoose document object)
 * @param {object} userData JSON data from request body
 */
const updateUser = async(response, userId, currentUser, userData) => {
  // TODO: 10.2 Implement this
  throw new Error('Not Implemented');
};

/**
 * Send user data as JSON
 *
 * @param {object} response outgoing server response
 * @param {string} userId id of the user to be viewed
 * @param {object} currentUser (mongoose document object)
 */
const viewUser = async(response, userId, currentUser) => {
  // TODO: 10.2 Implement this
  throw new Error('Not Implemented');
};

/**
 * Register new user and send created user back as JSON
 *
 * @param {object} response outgoing server response
 * @param {object} userData JSON data from request body
 */
const registerUser = async(response, userData) => {
  // TODO: 10.2 Implement this
  throw new Error('Not Implemented');
};

module.exports = { getAllUsers, registerUser, deleteUser, viewUser, updateUser };