import { describe, expect, it } from 'vitest';
import { makeProduct, snapshotProducts } from '../test-support/fixtures.js';
import { filterByCategory } from './catalogue-queries.js';
import { splitCategoryPage } from './category-page.js';
import type { Product } from './product.js';

const ids = (products: readonly Product[]): string[] => products.map((product) => product.id);

function categoryProducts(slug: string): Product[] {
  const products = filterByCategory(snapshotProducts(), slug);
  if (products === null) {
    throw new Error(`no products in ${slug}`);
  }
  return products;
}

const DEFAULT_FEATURED = ['12', '11', '3', '18', '5'];

describe('splitCategoryPage', () => {
  it('uses the featured products of this category, in configured order', () => {
    const page = splitCategoryPage(categoryProducts('electronics'), DEFAULT_FEATURED);

    expect(ids(page.topRated)).toEqual(['12', '11']);
    expect(ids(page.others)).toEqual(['9', '10', '13', '14']);
  });

  it('follows the configured order, not the source order', () => {
    const page = splitCategoryPage(categoryProducts('electronics'), ['11', '1', '12', '2', '3']);

    expect(ids(page.topRated)).toEqual(['11', '12']);
  });

  it('ignores featured products from other categories', () => {
    const page = splitCategoryPage(categoryProducts('jewellery'), DEFAULT_FEATURED);

    expect(ids(page.topRated)).toEqual(['5']);
    expect(ids(page.others)).toEqual(['6', '7', '8']);
  });

  it('falls back to the top 3 by rating when no featured product is in the category', () => {
    const page = splitCategoryPage(categoryProducts('electronics'), ['1', '2', '3', '4', '5']);

    // 12 and 11 are both rated 4.8: 12 has more ratings (400 vs 319), so it comes first.
    expect(ids(page.topRated)).toEqual(['12', '11', '9']);
    expect(ids(page.others)).toEqual(['10', '13', '14']);
  });

  it('breaks a full tie (same rate and count) by source order', () => {
    const tied = [
      makeProduct({ id: 'a', rating: { rate: 4, count: 10 } }),
      makeProduct({ id: 'b', rating: { rate: 4, count: 10 } }),
    ];

    expect(ids(splitCategoryPage(tied, []).topRated)).toEqual(['a', 'b']);
  });

  it('never picks an unrated product in the fallback, and shows fewer than 3 if needed', () => {
    const products = [
      makeProduct({ id: 'unrated', rating: null }),
      makeProduct({ id: 'rated', rating: { rate: 1, count: 1 } }),
    ];

    const page = splitCategoryPage(products, []);

    expect(ids(page.topRated)).toEqual(['rated']);
    expect(ids(page.others)).toEqual(['unrated']);
  });

  it('puts every product in exactly one section, for every category and featured set', () => {
    const featuredSets = [DEFAULT_FEATURED, ['1', '2', '3', '4', '5'], ['20', '19', '9', '6', '1'], []];
    for (const slug of ['mens-clothing', 'jewellery', 'electronics', 'womens-clothing']) {
      const products = categoryProducts(slug);
      for (const featured of featuredSets) {
        const page = splitCategoryPage(products, featured);
        const shown = [...ids(page.topRated), ...ids(page.others)];

        expect(new Set(shown).size).toBe(shown.length);
        expect([...shown].sort()).toEqual(ids(products).sort());
        expect(page.topRated.length).toBeGreaterThan(0);
      }
    }
  });
});
