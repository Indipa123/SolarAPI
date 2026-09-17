async function validate() {
  const { default: parser } = await import('@apidevtools/swagger-parser');
  await parser.validate(JSON.parse(JSON.stringify(require('../src/config/swagger'))));
  console.log('OpenAPI 3.0.3 contract is valid.');
}
validate().catch((error) => { console.error(error.message); process.exitCode = 1; });
