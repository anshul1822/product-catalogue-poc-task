import { ConfigError } from '../../domain/errors.js';
import { isValidProductId } from '../../domain/product.js';
import type { FeaturedProducts } from '../../ports/featured-products.js';

/** The home-page AC: "GIVEN I have chosen 5 products to be top rated". */
export const FEATURED_PRODUCT_COUNT = 5;

/**
 * Parses `FEATURED_PRODUCT_IDS`, e.g. "12,11,3,18,5", into ids in display order.
 * Rejects blanks, invalid characters, duplicates and a count other than
 * `expectedCount`, so a bad config fails at startup instead of on the home page.
 * Whether the ids exist in the product source is checked at request time.
 */
export function parseFeaturedIds(raw: string, expectedCount = FEATURED_PRODUCT_COUNT): string[] {
  const ids = raw.split(',').map((id) => id.trim());

  const invalid = ids.filter((id) => !isValidProductId(id));
  if (invalid.length > 0) {
    throw new ConfigError(
      `FEATURED_PRODUCT_IDS must be a comma-separated list of product ids; invalid: ${JSON.stringify(invalid)}`,
    );
  }

  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new ConfigError(`FEATURED_PRODUCT_IDS contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
  }

  if (ids.length !== expectedCount) {
    throw new ConfigError(`FEATURED_PRODUCT_IDS must list exactly ${expectedCount} ids; got ${ids.length}`);
  }

  return ids;
}

/** `FeaturedProducts` backed by configuration. A CMS or database can replace it. */
export class ConfigFeaturedProducts implements FeaturedProducts {
  private readonly ids: readonly string[];

  constructor(ids: readonly string[]) {
    this.ids = [...ids];
  }

  async getFeaturedIds(): Promise<readonly string[]> {
    return this.ids;
  }
}
