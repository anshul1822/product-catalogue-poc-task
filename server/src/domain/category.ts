import type { Category } from './product.js';

/**
 * URL-safe slug: lower case, apostrophes dropped, other non-alphanumeric runs
 * become "-". "Men's Clothing" -> "mens-clothing".
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "men's clothing" -> "Men's Clothing". */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Slugs the app accepts: what `slugify` can produce, up to 64 characters
 * ("mens-clothing"). Anything else cannot be a category, so it is rejected
 * before any product source is asked.
 */
const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCategorySlug(slug: string): boolean {
  return slug.length <= 64 && CATEGORY_SLUG_PATTERN.test(slug);
}

/** Builds a category from its display name; the slug is derived from the name. */
export function categoryFromName(name: string): Category {
  const displayName = name.trim();
  return { slug: slugify(displayName), name: displayName };
}
