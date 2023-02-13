const mongoose = require('mongoose');
require('dotenv').config();  
/**
 * Get database connect URL.
 *
 * Returns the MongoDB connection URL from DBURL environment variable,
 * or if the environment variable is not defined, return the default URL
 * mongodb://localhost:27017/WebShopDb
 *
 * @returns {string} connection URL
 */
const getDbUrl = () => {
  if (!process.env.DBURL){
    return "mongodb://localhost:27017/WebShopDb";
  }
  const dbUrl = process.env.DBURL;
  return dbUrl;
};

/**
 * Connects to database
 */
function connectDB() {
  // Do nothing if already connected
  if (!mongoose.connection || mongoose.connection.readyState === 0) {
    mongoose
      .connect(getDbUrl(), {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
        autoIndex: true
      })
      .then(() => {
        mongoose.connection.on('error', err => {
          console.error(err);
        });

        mongoose.connection.on('reconnectFailed', handleCriticalError);
      })
      .catch(handleCriticalError);
  }
}

/**
 * Handles critical errors.
 * 
 * @param {Error} err critical error to be handled
 */
function handleCriticalError(err) {
  console.error(err);
  throw err;
}

/**
 * Disconnects the database.
 */
function disconnectDB() {
  mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB, getDbUrl };