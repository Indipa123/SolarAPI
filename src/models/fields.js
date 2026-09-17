const { Schema } = require('mongoose');
exports.reference = (ref) => ({ type: Schema.Types.ObjectId, ref, required: true, index: true });
exports.name = { type: String, required: true, trim: true, maxlength: 120 };
exports.code = { type: String, required: true, trim: true, uppercase: true, unique: true, maxlength: 30 };
exports.latitude = { type: Number, min: -90, max: 90 };
exports.longitude = { type: Number, min: -180, max: 180 };
exports.nonnegative = { type: Number, required: true, min: 0, validate: Number.isFinite };
