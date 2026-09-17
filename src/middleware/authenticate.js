const ApiError = require('../utils/ApiError');
const { verify } = require('../config/auth');
const { isObjectIdOrHexString } = require('mongoose');

function authenticate(req, res, next) {
  const header = req.get('authorization');
  if (!header || !header.startsWith('Bearer ') || header.slice(7).includes(' ')) {
    return next(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'A valid access token is required.'));
  }
  try {
    const auth = verify(header.slice(7));
    if (!isObjectIdOrHexString(auth.sub) || !['USER', 'DEVICE'].includes(auth.type)) throw new Error('Unsupported token subject.');
    if (auth.type === 'USER') {
      if (!['NATIONAL', 'PROVINCE', 'DISTRICT'].includes(auth.role)) throw new Error('Invalid role.');
      if (auth.role === 'PROVINCE' && !isObjectIdOrHexString(auth.provinceId)) throw new Error('Missing province scope.');
      if (auth.role === 'DISTRICT' && !isObjectIdOrHexString(auth.districtId)) throw new Error('Missing district scope.');
    } else if (auth.sub !== auth.installationId || !isObjectIdOrHexString(auth.installationId)) {
      throw new Error('Invalid device scope.');
    }
    req.auth = auth;
    return next();
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.'));
  }
}

function requireUser(req, res, next) {
  if (req.auth.type !== 'USER' || !['NATIONAL', 'PROVINCE', 'DISTRICT'].includes(req.auth.role)) {
    return next(new ApiError(403, 'FORBIDDEN', 'This resource is available to SLSEA users only.'));
  }
  return next();
}

function requireDeviceForInstallation(req, res, next) {
  if (req.auth.type !== 'DEVICE' || req.auth.scope !== 'reading:write') {
    return next(new ApiError(403, 'FORBIDDEN', 'Only metering devices can submit readings.'));
  }
  if (req.auth.installationId !== req.params.installationId) {
    return next(new ApiError(403, 'INSTALLATION_SCOPE_VIOLATION', 'This device cannot submit readings for another installation.', {
      requestedInstallationId: req.params.installationId,
    }));
  }
  return next();
}

module.exports = { authenticate, requireUser, requireDeviceForInstallation };
