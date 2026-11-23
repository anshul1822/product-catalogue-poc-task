import type { Category, Product } from './product.js';
import { matchesSearch } from './search.js';

/**
 * Pure query helpers over an in-memory product list. Adapters whose source
 * cannot filter or search natively (Fake Store, the in-memory test source) use these,
 * so every source applies the same rules.
 */

/** Unique categories in first-seen order. */
export function deriveCategories(products: readonly Product[]): Category[] {
  const bySlug = new Map<string, Category>();
  for (const product of products) {
    if (!bySlug.has(product.category.slug)) {
      bySlug.set(product.category.slug, product.category);
    }
  }
  return [...bySlug.values()];
}

/** Products in the category, in source order; `null` when the slug is unknown. */
export function filterByCategory(products: readonly Product[], slug: string): Product[] | null {
  const matches = products.filter((product) => product.category.slug === slug);
  return matches.length === 0 ? null : matches;
}

export function searchProducts(products: readonly Product[], term: string): Product[] {
  return products.filter((product) => matchesSearch(product, term));
}

/** Products in the order of `ids`; unknown and repeated ids are skipped. */
export function pickByIds(products: readonly Product[], ids: readonly string[]): Product[] {
  const byId = new Map(products.map((product) => [product.id, product] as const));
  const seen = new Set<string>();
  const picked: Product[] = [];
  for (const id of ids) {
    const product = byId.get(id);
    if (product !== undefined && !seen.has(id)) {
      seen.add(id);
      picked.push(product);
    }
  }
  return picked;
}
