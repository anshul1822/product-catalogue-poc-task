/**
 * Composition root: the only place that reads the environment, chooses adapters
 * and starts the server. Swapping the product source, the email provider or the
 * enquiry store means changing one line here, not the services.
 */
import { ConsoleEmailSender } from './adapters/email-console/console-email-sender.js';
import { SmtpEmailSender } from './adapters/email-smtp/smtp-email-sender.js';
import { MemoryEnquiryRepository } from './adapters/enquiry-memory/memory-enquiry-repository.js';
import { PostgresEnquiryRepository } from './adapters/enquiry-postgres/postgres-enquiry-repository.js';
import { ConfigFeaturedProducts } from './adapters/featured-config/config-featured-products.js';
import { FakeStoreProductSource } from './adapters/fakestore/fakestore-product-source.js';
import { createApp } from './app.js';
import { type AppConfig, loadConfig } from './config.js';
import { ConfigError } from './domain/errors.js';
import type { Logger } from './logger.js';
import type { EmailSender } from './ports/email-sender.js';
import type { EnquiryRepository } from './ports/enquiry-repository.js';
import { CatalogueService } from './services/catalogue-service.js';
import { EnquiryService } from './services/enquiry-service.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

function enquiryRepository(config: AppConfig): { repository: EnquiryRepository; close: () => Promise<void> } {
  if (config.enquiryStore.kind === 'postgres') {
    const repository = PostgresEnquiryRepository.fromUrl(config.enquiryStore.databaseUrl);
    return { repository, close: () => repository.disconnect() };
  }
  return { repository: new MemoryEnquiryRepository(), close: () => Promise.resolve() };
}

function emailSender(config: AppConfig, logger: Logger): EmailSender {
  return config.email.provider === 'smtp' ? new SmtpEmailSender(config.email) : new ConsoleEmailSender(logger);
}

function main(): void {
  const config = loadConfig();
  const logger = console;

  const products = new FakeStoreProductSource(config.fakeStore);
  const featured = new ConfigFeaturedProducts(config.featuredProductIds);
  const catalogue = new CatalogueService({ products, featured, logger });

  const { repository, close: closeRepository } = enquiryRepository(config);
  const enquiries = new EnquiryService({
    products,
    repository,
    email: emailSender(config, logger),
    logger,
    settings: { salesInbox: config.enquiryEmail.to, from: config.enquiryEmail.from, appUrl: config.publicAppUrl },
  });

  const app = createApp({ logger, catalogue, enquiries });

  const server = app.listen(config.port, () => {
    logger.info(
      `Catalogue API listening on http://localhost:${config.port} ` +
        `(enquiries: ${config.enquiryStore.kind}, email: ${config.email.provider})`,
    );
  });

  server.on('error', (error) => {
    logger.error(`Could not start the server on port ${config.port}:`, error.message);
    process.exit(1);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, closing the server`);
    server.close(() => {
      closeRepository().finally(() => process.exit(0));
    });
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
