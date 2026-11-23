/**
 * The products the business owner has chosen as "top rated".
 * Config today; a CMS, admin UI or database later.
 */
export interface FeaturedProducts {
  /** Product ids in display order. */
  getFeaturedIds(): Promise<readonly string[]>;
}
