const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('node:path');
const ApiError = require('./src/utils/ApiError');
const errorHandler = require('./src/middleware/errorHandler');
const geographyRoutes = require('./src/routes/geographyRoutes');
const connectDatabase = require('./src/config/database');

const app = express();
let serverlessDatabaseReady;
const swaggerAssets = {
  css: require.resolve('swagger-ui-dist/swagger-ui.css'),
  bundle: require.resolve('swagger-ui-dist/swagger-ui-bundle.js'),
};
app.disable('x-powered-by');
app.set('etag', false);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.get('/api-docs/swagger-ui.css', (req, res) => res.sendFile(swaggerAssets.css));
app.get('/api-docs/swagger-ui-bundle.js', (req, res) => res.sendFile(swaggerAssets.bundle));
app.get('/api-docs/swagger-init.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/api-docs/swagger-init.js'));
});
app.get(['/api-docs', '/api-docs/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/api-docs/index.html'));
});
app.get('/openapi.json', (req, res) => res.json(require('./src/config/swagger')));

if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    try {
      if (!serverlessDatabaseReady) serverlessDatabaseReady = connectDatabase();
      await serverlessDatabaseReady;
      next();
    } catch (error) {
      serverlessDatabaseReady = undefined;
      next(new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is temporarily unavailable.'));
    }
  });
}
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ status: 'UP', timestamp: new Date().toISOString() });
});
app.get('/ready', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.set('Cache-Control', 'no-store').status(connected ? 200 : 503).json({
    status: connected ? 'READY' : 'NOT_READY', database: connected ? 'connected' : 'disconnected',
  });
});
app.use('/api/v1', require('./src/middleware/httpSemantics'));
app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1', geographyRoutes);
app.use('/api/v1', require('./src/routes/installationRoutes'));
app.use('/api/v1', require('./src/routes/analyticsRoutes'));
app.get('/', (req, res) => res.redirect('/api-docs'));
app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'The requested resource does not exist.')));
app.use(errorHandler);
module.exports = app;
