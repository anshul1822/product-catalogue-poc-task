import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './http/errors.js';
import { categoryRoutes } from './http/routes/categories.js';
import { featuredProductRoutes } from './http/routes/featured-products.js';
import { healthRoutes } from './http/routes/health.js';
import { productRoutes } from './http/routes/products.js';
import { searchRoutes } from './http/routes/search.js';
import type { Logger } from './logger.js';
import type { CatalogueService } from './services/catalogue-service.js';

/** Largest JSON body accepted; the biggest request (an enquiry) is well under this. */
export const JSON_BODY_LIMIT = '10kb';

/**
 * Everything the HTTP layer needs, injected by the composition root (`main.ts`)
 * or by tests. Feature slices add their services here.
 */
export interface AppDependencies {
  readonly logger: Logger;
  readonly catalogue: CatalogueService;
}

/** Builds the HTTP app without listening, so tests can drive it with Supertest. */
export function createApp({ logger, catalogue }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const api = express.Router();
  api.use(healthRoutes());
  api.use(featuredProductRoutes(catalogue));
  api.use(productRoutes(catalogue));
  api.use(categoryRoutes(catalogue));
  api.use(searchRoutes(catalogue));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
