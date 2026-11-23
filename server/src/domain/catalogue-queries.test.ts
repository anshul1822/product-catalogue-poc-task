import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test-support/fixtures.js';
import { deriveCategories, filterByCategory, pickByIds, searchProducts } from './catalogue-queries.js';

const pens = { slug: 'pens', name: 'Pens' };
const paper = { slug: 'paper', name: 'Paper' };

const products = [
  makeProduct({ id: 'a', title: 'Blue Pen', category: pens }),
  makeProduct({ id: 'b', title: 'Copy Paper', category: paper }),
  makeProduct({ id: 'c', title: 'Red Pen', category: pens }),
];

describe('deriveCategories', () => {
  it('returns unique categories in first-seen order', () => {
    expect(deriveCategories(products)).toEqual([pens, paper]);
  });

  it('returns an empty list for no products', () => {
    expect(deriveCategories([])).toEqual([]);
  });
});

describe('filterByCategory', () => {
  it('returns only products in the category, in source order', () => {
    expect(filterByCategory(products, 'pens')?.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('returns null for an unknown category', () => {
    expect(filterByCategory(products, 'toys')).toBeNull();
  });
});

describe('searchProducts', () => {
  it('returns only matching products', () => {
    expect(searchProducts(products, 'pen').map((p) => p.id)).toEqual(['a', 'c']);
    expect(searchProducts(products, 'stapler')).toEqual([]);
  });
});

describe('pickByIds', () => {
  it('keeps the requested order and skips unknown and repeated ids', () => {
    expect(pickByIds(products, ['c', 'zzz', 'a', 'c']).map((p) => p.id)).toEqual(['c', 'a']);
  });
});
