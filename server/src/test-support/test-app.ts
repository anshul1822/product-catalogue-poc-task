import { MemoryEnquiryRepository } from '../adapters/enquiry-memory/memory-enquiry-repository.js';
import { ConfigFeaturedProducts } from '../adapters/featured-config/config-featured-products.js';
import { InMemoryProductSource } from '../adapters/in-memory/in-memory-product-source.js';
import { createApp } from '../app.js';
import type { EmailMessage } from '../domain/enquiry-email.js';
import { UpstreamError } from '../domain/errors.js';
import type { EnquiryRateLimit } from '../http/routes/enquiries.js';
import type { EmailSender } from '../ports/email-sender.js';
import type { EnquiryRepository } from '../ports/enquiry-repository.js';
import type { ProductSource } from '../ports/product-source.js';
import { CatalogueService } from '../services/catalogue-service.js';
import { EnquiryService } from '../services/enquiry-service.js';
import { type RecordingLogger, recordingLogger, snapshotProducts } from './fixtures.js';

export const DEFAULT_FEATURED_IDS = ['12', '11', '3', '18', '5'] as const;

export const ENQUIRY_SETTINGS = {
  salesInbox: 'sales@catalogue.test',
  from: 'no-reply@catalogue.test',
  appUrl: 'http://shop.test',
} as const;

/** An `EmailSender` that keeps what it was asked to send, or fails like a dead mail server. */
export class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  failing = false;

  async send(message: EmailMessage): Promise<void> {
    if (this.failing) {
      throw new UpstreamError('smtp', 'sending failed: ECONNECTION');
    }
    this.sent.push(message);
  }
}

export interface TestAppOptions {
  /** Defaults to the 20 recorded Fake Store products, in memory. */
  readonly products?: ProductSource;
  readonly featuredIds?: readonly string[];
  readonly repository?: EnquiryRepository;
  readonly email?: EmailSender;
  /** Defaults to a limit high enough never to be hit. */
  readonly enquiryRateLimit?: EnquiryRateLimit;
}

/** The real HTTP app, wired like `main.ts` but with test adapters and a recording logger. */
export function testApp(options: TestAppOptions = {}) {
  const logger: RecordingLogger = recordingLogger();
  const products = options.products ?? new InMemoryProductSource(snapshotProducts());
  const featured = new ConfigFeaturedProducts(options.featuredIds ?? DEFAULT_FEATURED_IDS);
  const catalogue = new CatalogueService({ products, featured, logger });

  const repository = options.repository ?? new MemoryEnquiryRepository();
  const email = options.email ?? new RecordingEmailSender();
  const enquiries = new EnquiryService({ products, repository, email, logger, settings: ENQUIRY_SETTINGS });

  const app = createApp({
    logger,
    catalogue,
    enquiries,
    enquiryRateLimit: options.enquiryRateLimit ?? { windowMs: 60_000, limit: 1_000 },
  });
  return { app, logger, repository, email };
}
