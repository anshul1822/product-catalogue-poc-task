/**
 * Source-agnostic catalogue model. Every product source maps into these types,
 * and the API returns them. Nothing here knows about Fake Store.
 */

export interface Category {
  /** URL-safe identifier, e.g. "mens-clothing". */
  readonly slug: string;
  /** Display name, e.g. "Men's Clothing". */
  readonly name: string;
}

export interface Rating {
  /** Average rating from the source, 0–5. */
  readonly rate: number;
  /** Number of ratings behind `rate`. */
  readonly count: number;
}

export interface Product {
  /** String so future sources (SKUs, UUIDs) need no type change. */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Unit price in the store currency (assumed AUD for the PoC; the source has no currency). */
  readonly price: number;
  readonly imageUrl: string;
  readonly category: Category;
  /** `null` when the source has no rating. */
  readonly rating: Rating | null;
}
