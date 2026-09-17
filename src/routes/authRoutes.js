const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { login } = require('../controllers/authController');
const { loginValidation } = require('../validators/authValidator');
router.post('/login', loginValidation, asyncHandler(login));
module.exports = router;
