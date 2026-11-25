import { describe, expect, it } from 'vitest';
import { toCategory, toProduct } from './mapper.js';
import { fakeStoreProductSchema } from './schema.js';

describe('toCategory', () => {
  it.each([
    ["men's clothing", { slug: 'mens-clothing', name: "Men's Clothing" }],
    ["women's clothing", { slug: 'womens-clothing', name: "Women's Clothing" }],
    ['electronics', { slug: 'electronics', name: 'Electronics' }],
    // Fake Store misspells "jewellery"; the domain does not.
    ['jewelery', { slug: 'jewellery', name: 'Jewellery' }],
  ])('%s', (source, expected) => {
    expect(toCategory(source)).toEqual(expected);
  });

  it('is not fooled by prototype keys', () => {
    expect(toCategory('constructor')).toEqual({ slug: 'constructor', name: 'Constructor' });
  });
});

describe('toProduct', () => {
  const raw = fakeStoreProductSchema.parse({
    id: 3,
    title: 'Mens Cotton Jacket ',
    price: 55.99,
    description: ' great outerwear jackets ',
    category: "men's clothing",
    image: 'https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png',
    rating: { rate: 4.7, count: 500 },
    internalNote: 'must not leak',
  });

  it('maps the Fake Store shape to the domain model', () => {
    expect(toProduct(raw)).toEqual({
      id: '3',
      title: 'Mens Cotton Jacket',
      description: 'great outerwear jackets',
      price: 55.99,
      imageUrl: 'https://fakestoreapi.com/img/71li-ujtlUL._AC_UX679_t.png',
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      rating: { rate: 4.7, count: 500 },
    });
  });

  it('uses null when the source has no rating', () => {
    const { rating: _rating, ...unrated } = raw;
    expect(toProduct(unrated).rating).toBeNull();
  });
});
