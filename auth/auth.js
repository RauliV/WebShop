const utils = require('../utils/requestUtils.js');
const users = require('../utils/users.js');
const user = require('../models/user.js');

/**
 * Get current user based on the request headers
 *
 * @param {object} request incoming http request
 * @returns {object|null} current authenticated user or null if not yet authenticated
 */
const getCurrentUser = async request => {

 //const credentials;
 const credentials = utils.getCredentials(request);
 if(credentials === null){
   return null;
 }

 const param = {
   email: credentials[0]
 };
 const myUser = await user.findOne(param).exec();

 if(myUser === null){
   return null;
 }
 const checkedUser = await myUser.checkPassword(credentials[1]);

 if (checkedUser){
   return myUser;
 } else {
   return null;
 }
 
};

module.exports = { getCurrentUser };
