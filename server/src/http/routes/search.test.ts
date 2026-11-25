import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { FakeStoreProductSource } from '../../adapters/fakestore/fakestore-product-source.js';
import { matchesSearch } from '../../domain/search.js';
import type { Product } from '../../domain/product.js';
import { FAKE_BASE_URL, fakeStoreServer, readRawSnapshot, respondWith, snapshotProducts } from '../../test-support/fixtures.js';
import { testApp } from '../../test-support/test-app.js';

const ids = (products: Array<{ id: string }>): string[] => products.map((product) => product.id);

function fakeStoreApp() {
  const fetch = fakeStoreServer(readRawSnapshot());
  const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch });
  return { ...testApp({ products }), fetch };
}

describe('GET /api/search?q= (F3)', () => {
  it('returns only the products whose text matches the term', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/search').query({ q: 'jacket' });

    expect(response.status).toBe(200);
    expect(ids(response.body)).toEqual(['3', '15', '16', '17']);
  });

  it.each([
    ['JACKET', ['3', '15', '16', '17']],
    ['  jacket  ', ['3', '15', '16', '17']],
    ['cotton jacket', ['3', '16', '17']],
    ['jacket cotton', ['3', '16', '17']],
    // Substring match (D-06): "mens" is inside "Women's", so women's products and
    // product 5 ("John Hardy Women's ...", jewellery) match too.
    ["men's", ['1', '2', '3', '4', '5', '15', '16', '17', '18', '19', '20']],
    ['ssd', ['10', '11']],
  ])('%j matches %j (case, spaces, word order and apostrophes do not matter)', async (q, expected) => {
    const { app } = testApp();

    const response = await request(app).get('/api/search').query({ q });

    expect(ids(response.body)).toEqual(expected);
  });

  it('never returns a product that does not match, and misses none that do', async () => {
    const { app } = testApp();
    const all = snapshotProducts();

    for (const q of ['gold', 'women', 'usb 3.0', 'backpack', 'monitor']) {
      const response = await request(app).get('/api/search').query({ q });
      const returned = response.body as Product[];

      expect(returned.every((product) => matchesSearch(product, q))).toBe(true);
      expect(ids(returned)).toEqual(ids(all.filter((product) => matchesSearch(product, q))));
    }
  });

  it('returns an empty list, not an error, when nothing matches', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/search').query({ q: 'zzzz-no-such-product' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it.each(['.*', '[(', '\\', '<script>alert(1)</script>'])(
    'treats %j as plain text (no regex, no injection)',
    async (q) => {
      const { app } = testApp();

      const response = await request(app).get('/api/search').query({ q });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    },
  );

  it('matches "%" literally: only products whose text contains it', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/search').query({ q: '%' });
    const returned = response.body as Product[];

    expect(returned.length).toBeGreaterThan(0);
    expect(returned.every((product) => `${product.title} ${product.description}`.includes('%'))).toBe(true);
  });

  it('accepts a term of exactly 100 characters', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/search').query({ q: 'x'.repeat(100) });

    expect(response.status).toBe(200);
  });

  it.each([
    ['no q', '/api/search', 'Enter a search term.'],
    ['an empty q', '/api/search?q=', 'Enter a search term.'],
    ['a blank q', '/api/search?q=%20%20%20', 'Enter a search term.'],
    ['a q over 100 characters', `/api/search?q=${'x'.repeat(101)}`, 'Use at most 100 characters.'],
    ['a repeated q', '/api/search?q=jacket&q=shirt', 'Enter a search term.'],
  ])('answers 400 for %s, without calling Fake Store', async (_case, url, message) => {
    const { app, fetch } = fakeStoreApp();

    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: 'INVALID_SEARCH_TERM', message, details: { field: 'q' } } });
    expect(fetch.requestedUrls).toEqual([]);
  });

  it('works end to end through the real Fake Store adapter: one GET /products', async () => {
    const { app, fetch } = fakeStoreApp();

    const response = await request(app).get('/api/search').query({ q: 'jacket' });

    expect(ids(response.body)).toEqual(['3', '15', '16', '17']);
    expect(fetch.requestedUrls).toEqual([`${FAKE_BASE_URL}/products`]);
  });

  it('answers 502 when Fake Store fails', async () => {
    const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch: respondWith('oops', 500) });
    const { app } = testApp({ products });

    const response = await request(app).get('/api/search').query({ q: 'jacket' });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
