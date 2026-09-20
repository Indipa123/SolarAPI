const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const Installation = require('../models/SolarInstallation');
const { signDevice } = require('../config/auth');
const { installation } = require('../services/installationService');
const ApiError = require('../utils/ApiError');
const dummyHash = bcrypt.hashSync('invalid-device-placeholder', 12);

exports.exchange = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['meterId', 'apiKey'].includes(k)) ||
      typeof body.meterId !== 'string' || !body.meterId.trim() || body.meterId.length > 100 ||
      typeof body.apiKey !== 'string' || body.apiKey.length < 32 || body.apiKey.length > 128) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Supply meterId and apiKey as strings.');
  }
  const item = await Installation.findOne({ meterId: body.meterId.trim() }).select('+deviceKeyHash').lean();
  const valid = await bcrypt.compare(body.apiKey, item?.deviceKeyHash || dummyHash);
  if (!item?.deviceKeyHash || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid device credentials.');
  res.set('Cache-Control', 'no-store').json({ accessToken: signDevice(item._id), tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h', installationId: item._id });
};

exports.rotate = async (req, res) => {
  const item = await installation(req.params.installationId);
  const apiKey = randomBytes(32).toString('hex');
  const deviceKeyHash = await bcrypt.hash(apiKey, 12);
  const result = await Installation.updateOne({ _id: item._id, deletedAt: null }, { $set: { deviceKeyHash }, $inc: { revision: 1 } });
  if (!result.matchedCount) throw new ApiError(404, 'INSTALLATION_NOT_FOUND', 'Installation does not exist.');
  res.set('Cache-Control', 'no-store').status(201).json({ installationId: item._id, meterId: item.meterId, apiKey,
    message: 'Store this credential securely. It is shown only once. Existing access tokens expire normally.' });
};
