const { Schema, model } = require('mongoose');
const { name, code, reference } = require('./fields');
module.exports = model('District', new Schema({ name, code, province: reference('Province') }, { timestamps: true }));
