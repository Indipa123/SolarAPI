const { body } = require('express-validator');
const validate = require('../middleware/validate');
const fields = ['timestamp', 'powerKw', 'energyKwh', 'voltage'];

module.exports = [
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !fields.includes(key))) {
      throw new Error(`Request body must contain only: ${fields.join(', ')}.`);
    }
    return true;
  }),
  body('timestamp').isString().bail().isISO8601({ strict: true, strictSeparator: true }).bail()
    .matches(/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/).withMessage('timestamp must include a time and timezone.'),
  ...['powerKw', 'energyKwh', 'voltage'].map((field) => body(field)
    .custom((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .withMessage(`${field} must be a finite JSON number greater than or equal to 0.`)),
  validate,
];
