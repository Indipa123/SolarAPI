const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const ApiError = require('./src/utils/ApiError');
const errorHandler = require('./src/middleware/errorHandler');
const geographyRoutes = require('./src/routes/geographyRoutes');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ status: 'UP', timestamp: new Date().toISOString() });
});
app.get('/ready', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.set('Cache-Control', 'no-store').status(connected ? 200 : 503).json({
    status: connected ? 'READY' : 'NOT_READY', database: connected ? 'connected' : 'disconnected',
  });
});
app.use('/api/v1/auth', require('./src/routes/authRoutes'));
app.use('/api/v1', geographyRoutes);
app.use('/api/v1', require('./src/routes/installationRoutes'));
app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'The requested resource does not exist.')));
app.use(errorHandler);
module.exports = app;
