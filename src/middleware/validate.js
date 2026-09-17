const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(400, 'VALIDATION_ERROR', 'The request contains invalid values.', errors.array().map((error) => ({
    field: error.path, message: error.msg,
  }))));
  return next();
};
