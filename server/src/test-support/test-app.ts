import { ConfigFeaturedProducts } from '../adapters/featured-config/config-featured-products.js';
import { InMemoryProductSource } from '../adapters/in-memory/in-memory-product-source.js';
import { createApp } from '../app.js';
import type { ProductSource } from '../ports/product-source.js';
import { CatalogueService } from '../services/catalogue-service.js';
import { type RecordingLogger, recordingLogger, snapshotProducts } from './fixtures.js';

export const DEFAULT_FEATURED_IDS = ['12', '11', '3', '18', '5'] as const;

export interface TestAppOptions {
  /** Defaults to the 20 recorded Fake Store products, in memory. */
  readonly products?: ProductSource;
  readonly featuredIds?: readonly string[];
}

/** The real HTTP app, wired like `main.ts` but with test adapters and a recording logger. */
export function testApp(options: TestAppOptions = {}) {
  const logger: RecordingLogger = recordingLogger();
  const products = options.products ?? new InMemoryProductSource(snapshotProducts());
  const featured = new ConfigFeaturedProducts(options.featuredIds ?? DEFAULT_FEATURED_IDS);
  const catalogue = new CatalogueService({ products, featured, logger });
  return { app: createApp({ logger, catalogue }), logger };
}
