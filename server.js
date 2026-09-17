require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const app = require('./app');
const connectDatabase = require('./src/config/database');

async function startServer() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  await connectDatabase();
  const server = app.listen(port, () => console.log(`Solar API listening on port ${port}`));
  server.on('error', async () => {
    console.error('HTTP server failed to start. Check the configured port.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timeout);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return server;
}

if (require.main === module) {
  startServer().catch(() => {
    console.error('Startup failed. Check PORT, MONGODB_URI, and database availability.');
    process.exitCode = 1;
  });
}
module.exports = startServer;
