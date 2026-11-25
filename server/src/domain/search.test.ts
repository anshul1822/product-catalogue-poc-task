import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test-support/fixtures.js';
import { matchesSearch, toSearchWords } from './search.js';

const backpack = makeProduct({
  title: 'Fjallraven Foldsack Backpack',
  description: 'Padded sleeve fits a 15 inch laptop',
  category: { slug: 'mens-clothing', name: "Men's Clothing" },
});

describe('matchesSearch', () => {
  it('matches the title, ignoring case', () => {
    expect(matchesSearch(backpack, 'BACKPACK')).toBe(true);
  });

  it('matches the description', () => {
    expect(matchesSearch(backpack, 'laptop')).toBe(true);
  });

  it('matches the category name', () => {
    expect(matchesSearch(backpack, 'clothing')).toBe(true);
  });

  it('matches a partial word', () => {
    expect(matchesSearch(backpack, 'back')).toBe(true);
  });

  it('requires every word, in any order', () => {
    expect(matchesSearch(backpack, 'laptop backpack')).toBe(true);
    expect(matchesSearch(backpack, 'laptop tent')).toBe(false);
  });

  it('ignores apostrophes in both the term and the product', () => {
    expect(matchesSearch(backpack, 'mens')).toBe(true);
    expect(matchesSearch(makeProduct({ title: 'Mens Cotton Jacket' }), "men's jacket")).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(matchesSearch(backpack, 'monitor')).toBe(false);
  });

  it('matches nothing for a blank term', () => {
    expect(matchesSearch(backpack, '')).toBe(false);
    expect(matchesSearch(backpack, '   ')).toBe(false);
  });

  it('treats regex characters literally', () => {
    const product = makeProduct({ title: 'C++ Guide (2nd edition)', description: '' });
    expect(matchesSearch(product, 'c++ (2nd')).toBe(true);
    expect(matchesSearch(product, '.*')).toBe(false);
    expect(() => matchesSearch(product, '[(')).not.toThrow();
  });
});

describe('toSearchWords', () => {
  it('normalises case, apostrophes and whitespace', () => {
    expect(toSearchWords("  Men's   JACKET ")).toEqual(['mens', 'jacket']);
    expect(toSearchWords(' \t ')).toEqual([]);
  });
});
