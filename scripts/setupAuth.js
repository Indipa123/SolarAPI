const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const dotenv = require('dotenv');

// Preserve existing configured secrets; never print their values.
const envPath = path.join(__dirname, '..', '.env');
let source = fs.readFileSync(envPath, 'utf8');
const values = dotenv.parse(source);
for (const [key, minimum] of [['JWT_SECRET', 32], ['SEED_USER_PASSWORD', 12]]) {
  if (values[key] && values[key].length < minimum) throw new Error(`${key} is present but too short. Update it in .env.`);
}
for (const [key, value] of Object.entries({ JWT_SECRET: randomBytes(48).toString('hex'), SEED_USER_PASSWORD: randomBytes(24).toString('hex'), JWT_EXPIRES_IN: '1h' })) {
  if (values[key]) continue;
  const expression = new RegExp(`^(?:export\\s+)?${key}\\s*=.*$`, 'gm');
  if (expression.test(source)) source = source.replace(expression, `${key}=${value}`);
  else source += `\n${key}=${value}\n`;
}
fs.writeFileSync(envPath, source, { mode: 0o600 });
fs.chmodSync(envPath, 0o600);
console.log('Local authentication configuration is ready in .env. No secret values are printed.');
