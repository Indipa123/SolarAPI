const { Schema, model } = require('mongoose');
const { name, code, reference, latitude, longitude } = require('./fields');
module.exports = model('GridSubstation', new Schema({ name, code, district: reference('District'), latitude, longitude }, { timestamps: true }));
