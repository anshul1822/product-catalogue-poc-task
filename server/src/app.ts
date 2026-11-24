import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './http/errors.js';
import { categoryRoutes } from './http/routes/categories.js';
import { type EnquiryRateLimit, enquiryRoutes } from './http/routes/enquiries.js';
import { featuredProductRoutes } from './http/routes/featured-products.js';
import { healthRoutes } from './http/routes/health.js';
import { productRoutes } from './http/routes/products.js';
import { searchRoutes } from './http/routes/search.js';
import type { Logger } from './logger.js';
import type { CatalogueService } from './services/catalogue-service.js';
import type { EnquiryService } from './services/enquiry-service.js';

/** Largest JSON body accepted; the biggest request (an enquiry) is well under this. */
export const JSON_BODY_LIMIT = '10kb';

/**
 * Proxies whose `X-Forwarded-For` is believed: loopback and private networks, which
 * is where nginx runs (the Docker network). The client IP is needed for the enquiry
 * rate limit; trusting every proxy would let any client pick its own IP.
 */
export const TRUSTED_PROXIES = 'loopback, linklocal, uniquelocal';

/**
 * Everything the HTTP layer needs, injected by the composition root (`main.ts`)
 * or by tests.
 */
export interface AppDependencies {
  readonly logger: Logger;
  readonly catalogue: CatalogueService;
  readonly enquiries: EnquiryService;
  readonly enquiryRateLimit?: EnquiryRateLimit;
}

/** Builds the HTTP app without listening, so tests can drive it with Supertest. */
export function createApp({ logger, catalogue, enquiries, enquiryRateLimit }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', TRUSTED_PROXIES);
  app.use(helmet());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const api = express.Router();
  api.use(healthRoutes());
  api.use(featuredProductRoutes(catalogue));
  api.use(productRoutes(catalogue));
  api.use(categoryRoutes(catalogue));
  api.use(searchRoutes(catalogue));
  api.use(enquiryRoutes(enquiries, enquiryRateLimit));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
