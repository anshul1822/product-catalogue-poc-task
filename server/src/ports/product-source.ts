import type { Category, Product } from '../domain/product.js';

/**
 * Where product data comes from (Fake Store today; a database, PIM or CMS later).
 * Services depend on this interface only. Methods are query-shaped so a future
 * source can search or filter natively instead of loading everything.
 *
 * Contract:
 * - "Not found" is `null` or an empty list, never an error.
 * - A failure of the underlying system throws `UpstreamError`.
 */
export interface ProductSource {
  getAll(): Promise<Product[]>;

  getById(id: string): Promise<Product | null>;

  /** Products in the order of `ids`. Unknown ids are omitted. */
  getByIds(ids: readonly string[]): Promise<Product[]>;

  getCategories(): Promise<Category[]>;

  /** `null` when the category slug is unknown. */
  getByCategory(slug: string): Promise<Product[] | null>;

  /** Products whose text matches `term` (see `matchesSearch`). A blank term returns `[]`. */
  search(term: string): Promise<Product[]>;
}
