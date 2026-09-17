const { Schema, model } = require('mongoose');
const { reference, latitude, longitude, nonnegative } = require('./fields');
module.exports = model('SolarInstallation', new Schema({
  meterId: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  inverterId: { type: String, trim: true, maxlength: 100 },
  substation: reference('GridSubstation'),
  capacityKw: { ...nonnegative, validate: { validator: (value) => Number.isFinite(value) && value > 0, message: 'capacityKw must be positive and finite.' } },
  latitude, longitude,
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], default: 'ACTIVE' },
}, { timestamps: true }));
