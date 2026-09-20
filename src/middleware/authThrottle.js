const ApiError = require('../utils/ApiError');
// Bounded per-process safeguard. A shared rate limiter is required for a production fleet.
module.exports = function createThrottle() {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.reset <= now) attempts.delete(key);
    const key = req.ip;
    if (!attempts.has(key)) {
      if (attempts.size >= 10000) return next(new ApiError(429, 'RATE_LIMITED', 'Retry later.'));
      attempts.set(key, { count: 0, reset: now + 60000 });
    }
    const entry = attempts.get(key);
    if (++entry.count > 20) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return next(new ApiError(429, 'RATE_LIMITED', 'Too many authentication attempts. Retry later.'));
    }
    next();
  };
};
