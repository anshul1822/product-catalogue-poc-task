import { pickByIds } from './catalogue-queries.js';
import type { Category, Product } from './product.js';

/** How many products the fallback shows when none of a category's products is featured. */
export const CATEGORY_TOP_RATED_FALLBACK_COUNT = 3;

/** F2: what a category page shows. */
export interface CategoryPage {
  readonly category: Category;
  /** The category's "top rated" products (see `splitCategoryPage`). */
  readonly topRated: Product[];
  /** The rest of the category, in source order, never repeating a top-rated product. */
  readonly others: Product[];
}

/**
 * Splits one category's products into "top rated" and "others" (decision D3).
 *
 * - "Top rated" keeps the meaning it has on the home page: the products the owner
 *   chose (`featuredIds`) that belong to this category, in the configured order.
 * - If none of them is in this category, the section would be empty, so it falls
 *   back to the category's best rated products: highest `rating.rate` first, a
 *   tie broken by the higher `rating.count`, then source order. Products without
 *   a rating are never picked by the fallback.
 * - "Others" is every remaining product of the category, in source order.
 *
 * `products` must all belong to one category; the caller guarantees that.
 */
export function splitCategoryPage(
  products: readonly Product[],
  featuredIds: readonly string[],
  fallbackCount = CATEGORY_TOP_RATED_FALLBACK_COUNT,
): { topRated: Product[]; others: Product[] } {
  const featured = pickByIds(products, featuredIds);
  const topRated = featured.length > 0 ? featured : bestRated(products, fallbackCount);

  const topIds = new Set(topRated.map((product) => product.id));
  const others = products.filter((product) => !topIds.has(product.id));

  return { topRated, others };
}

function bestRated(products: readonly Product[], count: number): Product[] {
  return products
    .filter((product) => product.rating !== null)
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const rateA = a.product.rating?.rate ?? 0;
      const rateB = b.product.rating?.rate ?? 0;
      if (rateB !== rateA) {
        return rateB - rateA;
      }
      const countA = a.product.rating?.count ?? 0;
      const countB = b.product.rating?.count ?? 0;
      return countB !== countA ? countB - countA : a.index - b.index;
    })
    .slice(0, count)
    .map(({ product }) => product);
}
