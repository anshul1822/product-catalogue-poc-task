import type { Product } from '../domain/product.js';
import type { Logger } from '../logger.js';
import type { FeaturedProducts } from '../ports/featured-products.js';
import type { ProductSource } from '../ports/product-source.js';

export interface CatalogueServiceDependencies {
  readonly products: ProductSource;
  readonly featured: FeaturedProducts;
  readonly logger: Logger;
}

/**
 * Catalogue business rules. Depends only on ports, so it works the same with
 * Fake Store, a future product database or the in-memory source in tests.
 * Feature slices add methods here: getProduct (F4), category page (F2), search (F3).
 */
export class CatalogueService {
  private readonly products: ProductSource;
  private readonly featured: FeaturedProducts;
  private readonly logger: Logger;

  constructor({ products, featured, logger }: CatalogueServiceDependencies) {
    this.products = products;
    this.featured = featured;
    this.logger = logger;
  }

  /**
   * F1: the products the owner chose as "top rated", in the configured order.
   * A configured id the product source no longer has is skipped and logged as a
   * warning, so one stale id does not take the home page down.
   */
  async getFeatured(): Promise<Product[]> {
    const ids = await this.featured.getFeaturedIds();
    const products = await this.products.getByIds(ids);

    if (products.length < ids.length) {
      const found = new Set(products.map((product) => product.id));
      const missing = ids.filter((id) => !found.has(id));
      this.logger.warn(`Featured product ids not found in the product source: ${missing.join(', ')}`);
    }

    return products;
  }
}
