import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { FakeStoreProductSource } from '../../adapters/fakestore/fakestore-product-source.js';
import { FAKE_BASE_URL, fakeStoreServer, readRawSnapshot, respondWith } from '../../test-support/fixtures.js';
import { testApp } from '../../test-support/test-app.js';

type IdOnly = { id: string };
const ids = (products: IdOnly[]): string[] => products.map((product) => product.id);

const CATEGORY_NOT_FOUND = { error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found.' } };

function fakeStoreApp(featuredIds?: string[]) {
  const fetch = fakeStoreServer(readRawSnapshot());
  const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch });
  return { ...testApp(featuredIds === undefined ? { products } : { products, featuredIds }), fetch };
}

describe('GET /api/categories (F2)', () => {
  it('returns every category with its slug and display name', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'jewellery', name: 'Jewellery' },
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'womens-clothing', name: "Women's Clothing" },
    ]);
  });

  it('answers 502 when Fake Store fails', async () => {
    const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch: respondWith('oops', 500) });
    const { app } = testApp({ products });

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});

describe('GET /api/categories/:slug/products (F2)', () => {
  it.each([
    ['electronics', 'Electronics', ['12', '11'], ['9', '10', '13', '14']],
    ['jewellery', 'Jewellery', ['5'], ['6', '7', '8']],
    ['mens-clothing', "Men's Clothing", ['3'], ['1', '2', '4']],
    ['womens-clothing', "Women's Clothing", ['18'], ['15', '16', '17', '19', '20']],
  ])('%s: featured products as top rated, then the rest', async (slug, name, topRated, others) => {
    const { app } = testApp({ featuredIds: ['12', '11', '3', '18', '5'] });

    const response = await request(app).get(`/api/categories/${slug}/products`);

    expect(response.status).toBe(200);
    expect(response.body.category).toEqual({ slug, name });
    expect(ids(response.body.topRated)).toEqual(topRated);
    expect(ids(response.body.others)).toEqual(others);
  });

  it('shows only that category, never a product twice', async () => {
    const { app } = testApp();

    for (const slug of ['mens-clothing', 'jewellery', 'electronics', 'womens-clothing']) {
      const response = await request(app).get(`/api/categories/${slug}/products`);
      const shown = [...response.body.topRated, ...response.body.others] as Array<IdOnly & { category: { slug: string } }>;

      expect(shown.every((product) => product.category.slug === slug)).toBe(true);
      expect(new Set(ids(shown)).size).toBe(shown.length);
    }
  });

  it('falls back to the top 3 by rating when no featured product is in the category', async () => {
    const { app } = testApp({ featuredIds: ['1', '2', '3', '4', '5'] });

    const response = await request(app).get('/api/categories/electronics/products');

    expect(ids(response.body.topRated)).toEqual(['12', '11', '9']);
    expect(ids(response.body.others)).toEqual(['10', '13', '14']);
  });

  it('works end to end through the real Fake Store adapter: one GET /products', async () => {
    const { app, fetch } = fakeStoreApp();

    const response = await request(app).get('/api/categories/jewellery/products');

    expect(response.status).toBe(200);
    expect(ids(response.body.topRated)).toEqual(['5']);
    expect(fetch.requestedUrls).toEqual([`${FAKE_BASE_URL}/products`]);
  });

  it('returns 404 in the error shape for a category that does not exist', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/categories/toys/products');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(CATEGORY_NOT_FOUND);
  });

  it.each(['Electronics', 'jewelery', "men's%20clothing", '..%2Fproducts', 'x'.repeat(65)])(
    'returns 404 for %s; impossible slugs never reach Fake Store',
    async (slug) => {
      const { app, fetch } = fakeStoreApp();

      const response = await request(app).get(`/api/categories/${slug}/products`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual(CATEGORY_NOT_FOUND);
      // "jewelery" is a valid slug shape (just not a category), so only it is looked up.
      expect(fetch.requestedUrls).toEqual(slug === 'jewelery' ? [`${FAKE_BASE_URL}/products`] : []);
    },
  );

  it('answers 502 when Fake Store fails', async () => {
    const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch: respondWith('oops', 500) });
    const { app } = testApp({ products });

    const response = await request(app).get('/api/categories/electronics/products');

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
