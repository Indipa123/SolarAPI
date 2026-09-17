const { Schema, model } = require('mongoose');
const { name, code } = require('./fields');
module.exports = model('Province', new Schema({ name: { ...name, unique: true }, code }, { timestamps: true }));
