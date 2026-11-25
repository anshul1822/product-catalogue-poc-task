import { getJson } from './client';
import type { Category, CategoryPage, Product } from './types';

/**
 * One typed function per catalogue endpoint. Pages call these, never `fetch`.
 */

/** Longest search term the API accepts (server/src/domain/search.ts); the search box enforces it too. */
export const MAX_SEARCH_TERM_LENGTH = 100;

/** F1: the 5 "top rated" products, in display order. */
export function getFeaturedProducts(signal?: AbortSignal): Promise<Product[]> {
  return getJson<Product[]>('/featured-products', signal);
}

/** F4: one product. Rejects with an ApiError whose status is 404 when it does not exist. */
export function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
  return getJson<Product>(`/products/${encodeURIComponent(id)}`, signal);
}

/** F2: every category, for the header links. */
export function getCategories(signal?: AbortSignal): Promise<Category[]> {
  return getJson<Category[]>('/categories', signal);
}

/** F2: a category's top rated products and the rest. Rejects with status 404 for an unknown slug. */
export function getCategoryPage(slug: string, signal?: AbortSignal): Promise<CategoryPage> {
  return getJson<CategoryPage>(`/categories/${encodeURIComponent(slug)}/products`, signal);
}

/** F3: the products whose text matches `term`. Rejects with status 400 for a blank or too long term. */
export function searchProducts(term: string, signal?: AbortSignal): Promise<Product[]> {
  return getJson<Product[]>(`/search?${new URLSearchParams({ q: term }).toString()}`, signal);
}
