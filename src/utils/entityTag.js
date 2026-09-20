const { createHash } = require('node:crypto');
exports.installationTag = item => `"installation-${item._id}-v${item.revision || 0}"`;
exports.tag = value => value?.meterId && value?._id
  ? exports.installationTag(value)
  : `"${createHash('sha256').update(JSON.stringify(value)).digest('hex')}"`;
