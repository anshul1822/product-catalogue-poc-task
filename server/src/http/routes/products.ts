import { Router } from 'express';
import type { CatalogueService } from '../../services/catalogue-service.js';
import { ApiError } from '../errors.js';

/**
 * F4. `GET /api/products/:id`: one product, or 404 for an id that does not exist
 * or cannot be a product id. A product source failure goes to `errorHandler` (502).
 */
export function productRoutes(catalogue: CatalogueService): Router {
  const router = Router();
  router.get('/products/:id', async (req, res) => {
    const product = await catalogue.getProduct(req.params.id);
    if (product === null) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }
    res.json(product);
  });
  return router;
}
