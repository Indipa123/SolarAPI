const { Schema, model } = require('mongoose');
const { name } = require('./fields');
const schema = new Schema({
  name,
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['NATIONAL', 'PROVINCE', 'DISTRICT'] },
  province: { type: Schema.Types.ObjectId, ref: 'Province', default: null },
  district: { type: Schema.Types.ObjectId, ref: 'District', default: null },
}, { timestamps: true, toJSON: { transform: (doc, value) => { delete value.passwordHash; return value; } } });
schema.pre('validate', function () {
  if (this.role === 'PROVINCE' && !this.province) this.invalidate('province', 'Province users require a province.');
  if (this.role === 'DISTRICT' && !this.district) this.invalidate('district', 'District users require a district.');
  if (this.role === 'NATIONAL' && (this.province || this.district)) this.invalidate('role', 'National users must not have a regional scope.');
  if (this.role === 'PROVINCE' && this.district) this.invalidate('district', 'Province users must not have a district scope.');
  if (this.role === 'DISTRICT' && this.province) this.invalidate('province', 'District scope determines the province; omit province.');
});
module.exports = model('User', schema);
