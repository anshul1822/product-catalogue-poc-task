import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './http/errors.js';
import { healthRoutes } from './http/routes/health.js';
import type { Logger } from './logger.js';

/** Largest JSON body accepted; the biggest request (an enquiry) is well under this. */
export const JSON_BODY_LIMIT = '10kb';

/**
 * Everything the HTTP layer needs, injected by the composition root (`main.ts`)
 * or by tests. Feature slices add their services here.
 */
export interface AppDependencies {
  readonly logger: Logger;
}

/** Builds the HTTP app without listening, so tests can drive it with Supertest. */
export function createApp({ logger }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  const api = express.Router();
  api.use(healthRoutes());
  // Feature slices mount their routes on `api` here.
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
