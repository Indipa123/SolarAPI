const ApiError = require('../utils/ApiError');

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const malformedJson = err.type === 'entity.parse.failed';
  const tooLarge = err.type === 'entity.too.large';
  const duplicate = err?.code === 11000;
  const duplicateReading = duplicate && Boolean(err.keyPattern?.installation && err.keyPattern?.timestamp);
  const mongooseValidation = err?.name === 'ValidationError' || err?.name === 'CastError';
  const known = err instanceof ApiError;
  const status = malformedJson ? 400 : tooLarge ? 413 : duplicate ? 409 : mongooseValidation ? 400 : known ? err.status : 500;
  res.status(status).json({
    code: malformedJson ? 'INVALID_JSON' : tooLarge ? 'PAYLOAD_TOO_LARGE' : duplicate ? (duplicateReading ? 'DUPLICATE_READING' : 'DUPLICATE_RESOURCE') : mongooseValidation ? 'VALIDATION_ERROR' : known ? err.code : 'INTERNAL_SERVER_ERROR',
    message: malformedJson ? 'Request body must be valid JSON.' : tooLarge ? 'Request body exceeds the size limit.' : duplicate ? (duplicateReading ? 'A reading already exists for this installation and timestamp.' : 'A resource with this unique identifier already exists.') : mongooseValidation ? 'The request contains invalid values.' : known ? err.message : 'An unexpected error occurred.',
    details: known ? err.details : duplicate ? { fields: Object.keys(err.keyPattern || {}) } : null,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};
