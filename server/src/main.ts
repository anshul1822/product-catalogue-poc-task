/**
 * Composition root: the only place that reads the environment, chooses adapters
 * and starts the server. Feature slices build their adapters and services here
 * (e.g. `new FakeStoreProductSource(config.fakeStore)`) and pass them to `createApp`.
 */
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { ConfigError } from './domain/errors.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function main(): void {
  const config = loadConfig();
  const app = createApp({ logger: console });

  const server = app.listen(config.port, () => {
    console.info(`Catalogue API listening on http://localhost:${config.port}`);
  });

  server.on('error', (error) => {
    console.error(`Could not start the server on port ${config.port}:`, error.message);
    process.exit(1);
  });

  const shutdown = (signal: string): void => {
    console.info(`${signal} received, closing the server`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

try {
  main();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
