import { Router } from 'express';
import type { CatalogueService } from '../../services/catalogue-service.js';
import { ApiError } from '../errors.js';

/**
 * F2.
 * - `GET /api/categories`: every category, `{ slug, name }[]`, for the header links.
 * - `GET /api/categories/:slug/products`: `{ category, topRated, others }`, or 404
 *   for a slug that does not exist or cannot be a slug.
 * A product source failure goes to `errorHandler` (502).
 */
export function categoryRoutes(catalogue: CatalogueService): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    res.json(await catalogue.getCategories());
  });

  router.get('/categories/:slug/products', async (req, res) => {
    const page = await catalogue.getCategoryPage(req.params.slug);
    if (page === null) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
    }
    res.json(page);
  });

  return router;
}
