const mongoose = require('mongoose');
const ApiError = require('./ApiError');

module.exports = (value, field) => {
  if (!mongoose.isObjectIdOrHexString(value)) {
    throw new ApiError(400, 'INVALID_IDENTIFIER', `${field} must be a valid resource identifier.`, { field, value });
  }
  return value;
};
