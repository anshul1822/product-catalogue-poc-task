import { categoryFromName, toTitleCase } from '../../domain/category.js';
import type { Category, Product } from '../../domain/product.js';
import type { FakeStoreProduct } from './schema.js';

/**
 * Display-name fixes for Fake Store category values. A Map (not an object
 * literal) so values like "constructor" cannot hit prototype keys.
 */
const CATEGORY_NAME_OVERRIDES = new Map<string, string>([
  // Fake Store misspells it; the domain uses the Australian spelling.
  ['jewelery', 'Jewellery'],
]);

export function toCategory(sourceCategory: string): Category {
  const key = sourceCategory.trim().toLowerCase();
  return categoryFromName(CATEGORY_NAME_OVERRIDES.get(key) ?? toTitleCase(sourceCategory));
}

export function toProduct(raw: FakeStoreProduct): Product {
  return {
    id: String(raw.id),
    title: raw.title.trim(),
    description: raw.description.trim(),
    price: raw.price,
    imageUrl: raw.image,
    category: toCategory(raw.category),
    rating: raw.rating === undefined ? null : { rate: raw.rating.rate, count: raw.rating.count },
  };
}
