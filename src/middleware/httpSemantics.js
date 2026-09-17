const { createHash } = require('node:crypto');
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  res.vary('Accept');
  res.vary('Authorization');
  if (!req.accepts('json')) return next(new ApiError(406, 'NOT_ACCEPTABLE', 'This API provides application/json responses.'));
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send request bodies as application/json.'));
  }
  const json = res.json;
  res.json = function (payload) {
    if (['GET', 'HEAD'].includes(req.method) && this.statusCode === 200) {
      const serialized = JSON.stringify(payload);
      const tag = `"${createHash('sha256').update(serialized).digest('hex')}"`;
      this.set('ETag', tag);
      this.set('Cache-Control', 'private, no-cache');
      // Atomic documents have reliable modification metadata. Collections and
      // dynamic summaries use ETags because max(updatedAt) cannot detect removals.
      if (payload?._id && payload.updatedAt) {
        const modified = new Date(payload.updatedAt);
        if (Number.isFinite(modified.getTime())) this.set('Last-Modified', modified.toUTCString());
      }
      if (req.fresh) return this.status(304).end();
    } else this.set('Cache-Control', 'no-store');
    return json.call(this, payload);
  };
  next();
};
