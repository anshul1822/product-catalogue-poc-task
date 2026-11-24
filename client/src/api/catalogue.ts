import { getJson } from './client';
import type { Product } from './types';

/**
 * One typed function per catalogue endpoint. Pages call these, never `fetch`.
 * Feature slices add: getProduct (F4), getCategories / getCategoryPage (F2), searchProducts (F3).
 */

/** F1: the 5 "top rated" products, in display order. */
export function getFeaturedProducts(signal?: AbortSignal): Promise<Product[]> {
  return getJson<Product[]>('/featured-products', signal);
}
