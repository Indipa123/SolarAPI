const { Schema, model } = require('mongoose');
const { reference, latitude, longitude, nonnegative } = require('./fields');
const schema = new Schema({
  revision: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null, select: false },
  deviceKeyHash: { type: String, select: false },
  meterId: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  inverterId: { type: String, trim: true, maxlength: 100 },
  substation: reference('GridSubstation'),
  capacityKw: { ...nonnegative, validate: { validator: (value) => Number.isFinite(value) && value > 0, message: 'capacityKw must be positive and finite.' } },
  latitude, longitude,
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], default: 'ACTIVE' },
}, { timestamps: true });
schema.pre(/^find/, function () { this.where({ deletedAt: null }); });
schema.pre('countDocuments', function () { this.where({ deletedAt: null }); });
module.exports = model('SolarInstallation', schema);
