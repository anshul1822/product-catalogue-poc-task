import { isValidCategorySlug } from '../domain/category.js';
import { type CategoryPage, splitCategoryPage } from '../domain/category-page.js';
import { type Category, isValidProductId, type Product } from '../domain/product.js';
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

  /**
   * F4: one product, or `null` when it does not exist. An id that breaks the
   * product-id rule is `null` straight away, without asking the product source.
   */
  async getProduct(id: string): Promise<Product | null> {
    if (!isValidProductId(id)) {
      return null;
    }
    return this.products.getById(id);
  }

  /** F2: every category that has products, with its URL slug and display name. */
  async getCategories(): Promise<Category[]> {
    return this.products.getCategories();
  }

  /**
   * F2: a category's "top rated" products and the rest (rules in `splitCategoryPage`),
   * or `null` for a category that does not exist. A slug that breaks the slug rule
   * is `null` straight away, without asking the product source.
   */
  async getCategoryPage(slug: string): Promise<CategoryPage | null> {
    if (!isValidCategorySlug(slug)) {
      return null;
    }
    const [products, featuredIds] = await Promise.all([
      this.products.getByCategory(slug),
      this.featured.getFeaturedIds(),
    ]);
    const first = products?.[0];
    if (products === null || first === undefined) {
      return null;
    }
    return { category: first.category, ...splitCategoryPage(products, featuredIds) };
  }

  /**
   * F3: the products whose text matches `term` (rules in `matchesSearch`: every
   * word, any order, in title, description or category name; case and
   * apostrophes ignored), in source order. A blank term matches nothing.
   * The HTTP layer has already checked the term's length.
   */
  async search(term: string): Promise<Product[]> {
    const trimmed = term.trim();
    if (trimmed === '') {
      return [];
    }
    return this.products.search(trimmed);
  }
}
