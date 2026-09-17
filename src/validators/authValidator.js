const { body } = require('express-validator');
const validate = require('../middleware/validate');

const noExtraFields = (fields) => body().custom((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Request body must be a JSON object.');
  if (Object.keys(value).some((key) => !fields.includes(key))) throw new Error(`Only these fields are allowed: ${fields.join(', ')}.`);
  return true;
});

exports.loginValidation = [
  noExtraFields(['email', 'password']),
  body('email').isString().bail().trim().isEmail().withMessage('email must be a valid email address.').toLowerCase(),
  body('password').isString().isLength({ min: 1, max: 256 }).withMessage('password must be between 1 and 256 characters.'),
  validate,
];
