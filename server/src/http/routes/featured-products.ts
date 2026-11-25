import { Router } from 'express';
import type { CatalogueService } from '../../services/catalogue-service.js';

/**
 * F1. `GET /api/featured-products`: the 5 "top rated" products, in display order.
 * A product source failure rejects the handler; Express 5 passes it to
 * `errorHandler`, which answers 502.
 */
export function featuredProductRoutes(catalogue: CatalogueService): Router {
  const router = Router();
  router.get('/featured-products', async (_req, res) => {
    res.json(await catalogue.getFeatured());
  });
  return router;
}
