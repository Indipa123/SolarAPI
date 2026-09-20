const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { login } = require('../controllers/authController');
const { loginValidation } = require('../validators/authValidator');
const throttle = require('../middleware/authThrottle');
router.post('/login', throttle(), loginValidation, asyncHandler(login));
router.post('/device-token', throttle(), asyncHandler(require('../controllers/deviceAuthController').exchange));
module.exports = router;
