const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new ApiError(500, 'AUTH_CONFIGURATION_ERROR', 'Authentication is not configured correctly.');
  return value;
}

function expiry() { return process.env.JWT_EXPIRES_IN || '1h'; }

function signUser(user) {
  const payload = { type: 'USER', role: user.role };
  if (user.role === 'PROVINCE') payload.provinceId = user.province.toString();
  if (user.role === 'DISTRICT') payload.districtId = user.district.toString();
  return jwt.sign(payload, secret(), { subject: user._id.toString(), expiresIn: expiry(), algorithm: 'HS256' });
}

function signDevice(installationId) {
  return jwt.sign({ type: 'DEVICE', installationId: installationId.toString(), scope: 'reading:write' }, secret(), {
    subject: installationId.toString(), expiresIn: expiry(), algorithm: 'HS256',
  });
}

function verify(token) { return jwt.verify(token, secret(), { algorithms: ['HS256'] }); }
module.exports = { signUser, signDevice, verify };
