import { describe, expect, it } from 'vitest';
import { categoryFromName, isValidCategorySlug, slugify, toTitleCase } from './category.js';

describe('slugify', () => {
  it.each([
    ["Men's Clothing", 'mens-clothing'],
    ['Women\u2019s Clothing', 'womens-clothing'],
    ['Electronics', 'electronics'],
    ['  Home & Garden  ', 'home-garden'],
    ['Café Supplies', 'cafe-supplies'],
    ['A4/A3 Paper', 'a4-a3-paper'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('toTitleCase', () => {
  it('capitalises each word and keeps apostrophes', () => {
    expect(toTitleCase("men's clothing")).toBe("Men's Clothing");
    expect(toTitleCase('  ELECTRONICS ')).toBe('Electronics');
  });
});

describe('isValidCategorySlug', () => {
  it.each(['electronics', 'mens-clothing', 'a4-a3-paper', 'x'.repeat(64)])('accepts %j', (slug) => {
    expect(isValidCategorySlug(slug)).toBe(true);
  });

  it.each(['', 'Electronics', "men's-clothing", 'mens clothing', '-mens', 'mens-', 'mens--clothing', '../etc', 'x'.repeat(65)])(
    'rejects %j',
    (slug) => {
      expect(isValidCategorySlug(slug)).toBe(false);
    },
  );

  it('accepts every slug that slugify produces', () => {
    for (const name of ["Men's Clothing", 'Jewellery', 'Café Supplies', 'A4/A3 Paper']) {
      expect(isValidCategorySlug(slugify(name))).toBe(true);
    }
  });
});

describe('categoryFromName', () => {
  it('derives the slug from the display name', () => {
    expect(categoryFromName("Women's Clothing")).toEqual({
      slug: 'womens-clothing',
      name: "Women's Clothing",
    });
  });
});
