const mongoose = require('mongoose');

let connectionPromise;

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure it.');
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then(() => mongoose.connection)
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}

module.exports = connectDatabase;
