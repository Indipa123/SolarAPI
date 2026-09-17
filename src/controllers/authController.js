const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signUser } = require('../config/auth');

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  const valid = user && await bcrypt.compare(req.body.password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  const token = signUser(user);
  res.set('Cache-Control', 'no-store').status(200).json({ accessToken: token, tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN || '1h', user: {
    id: user._id, name: user.name, email: user.email, role: user.role,
  } });
};
