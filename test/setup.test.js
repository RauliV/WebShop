const mongoose = require('mongoose');

const dbConfig = {
  host: 'localhost',
  port: 27017,
  db: 'Test_WebShopDb'
};

/**
 * Run before all tests
 */
const beforeAll = async () => {
  const clearDb = async () => {
    for (const i in mongoose.connection.collections) {
      await mongoose.connection.collections[i].deleteMany({});
    }
  };

  if (!mongoose.connection || mongoose.connection.readyState === 0) {
    await mongoose.connect(`mongodb://${dbConfig.host}:${dbConfig.port}/${dbConfig.db}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true
    });

    mongoose.connection.on('error', err => {
      console.error(err);
    });

    mongoose.connection.on('reconnectFailed', err => {
      throw err;
    });
  }

  return await clearDb();
};

/**
 * Run after all tests
 */
const afterAll = done => {
  mongoose.disconnect();
  done();
};

module.exports.mochaHooks = { beforeAll, afterAll };
