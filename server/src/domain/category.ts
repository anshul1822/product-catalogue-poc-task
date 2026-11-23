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

/** Builds a category from its display name; the slug is derived from the name. */
export function categoryFromName(name: string): Category {
  const displayName = name.trim();
  return { slug: slugify(displayName), name: displayName };
}
