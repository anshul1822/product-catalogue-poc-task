import type { Product } from './product.js';

/** Longest search term accepted; the HTTP layer enforces the same limit. */
export const MAX_SEARCH_TERM_LENGTH = 100;

/** Lower case, apostrophes dropped, whitespace collapsed. Plain string ops only. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits a search term into normalised words. A blank term gives no words. */
export function toSearchWords(term: string): string[] {
  const normalised = normalise(term);
  return normalised === '' ? [] : normalised.split(' ');
}

/**
 * True when every word of `term` appears (as a substring, any order) in the
 * product's title, description or category name. Case-insensitive; apostrophes
 * are ignored so "mens" matches "Men's". A blank term matches nothing.
 * User input is only used with `includes`, never to build a regex.
 */
export function matchesSearch(product: Product, term: string): boolean {
  const words = toSearchWords(term);
  if (words.length === 0) {
    return false;
  }
  const haystack = normalise(
    [product.title, product.description, product.category.name].join(' '),
  );
  return words.every((word) => haystack.includes(word));
}
