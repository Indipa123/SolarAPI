require('dotenv').config({ quiet: true });

const app = require('../app');
const connectDatabase = require('../src/config/database');

let databaseReady;

module.exports = async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const originalPath = requestUrl.searchParams.get('__path');
  if (originalPath) {
    requestUrl.searchParams.delete('__path');
    const query = requestUrl.searchParams.toString();
    req.url = `${originalPath.startsWith('/') ? originalPath : `/${originalPath}`}${query ? `?${query}` : ''}`;
  }

  try {
    if (!databaseReady) databaseReady = connectDatabase();
    await databaseReady;
    return app(req, res);
  } catch (error) {
    databaseReady = undefined;
    res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      message: 'The database is temporarily unavailable.',
      details: null,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
};
