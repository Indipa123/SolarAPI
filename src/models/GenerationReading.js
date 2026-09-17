const { Schema, model } = require('mongoose');
const { reference, nonnegative } = require('./fields');
const schema = new Schema({
  installation: { ...reference('SolarInstallation'), index: false },
  timestamp: { type: Date, required: true },
  powerKw: nonnegative,
  energyKwh: nonnegative,
  voltage: nonnegative,
}, { timestamps: true });
// One compound index enforces uniqueness and supports both time sort directions.
schema.index({ installation: 1, timestamp: -1 }, { unique: true });
module.exports = model('GenerationReading', schema);
