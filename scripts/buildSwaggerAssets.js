const fs = require('node:fs');
const path = require('node:path');
const swaggerUiDist = require('swagger-ui-dist');

const sourceDirectory = swaggerUiDist.getAbsoluteFSPath();
const destinationDirectory = path.resolve(__dirname, '../public/api-docs');
const assets = ['swagger-ui.css', 'swagger-ui-bundle.js'];

fs.mkdirSync(destinationDirectory, { recursive: true });

for (const asset of assets) {
  fs.copyFileSync(
    path.join(sourceDirectory, asset),
    path.join(destinationDirectory, asset)
  );
}

console.log('Prepared local Swagger UI assets.');
