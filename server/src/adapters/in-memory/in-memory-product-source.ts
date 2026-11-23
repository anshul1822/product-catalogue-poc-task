import {
  deriveCategories,
  filterByCategory,
  pickByIds,
  searchProducts,
} from '../../domain/catalogue-queries.js';
import type { Category, Product } from '../../domain/product.js';
import type { ProductSource } from '../../ports/product-source.js';

/**
 * `ProductSource` over a fixed list of domain products, for service and HTTP tests.
 * It also runs the shared contract suite, which shows the port does not depend
 * on Fake Store. Not used at runtime: products come from Fake Store only.
 */
export class InMemoryProductSource implements ProductSource {
  private readonly products: readonly Product[];

  constructor(products: readonly Product[]) {
    this.products = [...products];
  }

  async getAll(): Promise<Product[]> {
    return [...this.products];
  }

  async getById(id: string): Promise<Product | null> {
    return this.products.find((product) => product.id === id) ?? null;
  }

  async getByIds(ids: readonly string[]): Promise<Product[]> {
    return pickByIds(this.products, ids);
  }

  async getCategories(): Promise<Category[]> {
    return deriveCategories(this.products);
  }

  async getByCategory(slug: string): Promise<Product[] | null> {
    return filterByCategory(this.products, slug);
  }

  async search(term: string): Promise<Product[]> {
    return searchProducts(this.products, term);
  }
}
