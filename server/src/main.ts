/**
 * Composition root: the only place that reads the environment, chooses adapters
 * and starts the server. Swapping the product source or the featured-products
 * store means changing one line here, not the services.
 */
import { ConfigFeaturedProducts } from './adapters/featured-config/config-featured-products.js';
import { FakeStoreProductSource } from './adapters/fakestore/fakestore-product-source.js';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { ConfigError } from './domain/errors.js';
import { CatalogueService } from './services/catalogue-service.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function main(): void {
  const config = loadConfig();
  const logger = console;

  const products = new FakeStoreProductSource(config.fakeStore);
  const featured = new ConfigFeaturedProducts(config.featuredProductIds);
  const catalogue = new CatalogueService({ products, featured, logger });

  const app = createApp({ logger, catalogue });

  const server = app.listen(config.port, () => {
    logger.info(`Catalogue API listening on http://localhost:${config.port}`);
  });

  server.on('error', (error) => {
    logger.error(`Could not start the server on port ${config.port}:`, error.message);
    process.exit(1);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, closing the server`);
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
