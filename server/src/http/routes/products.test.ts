import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { FakeStoreProductSource } from '../../adapters/fakestore/fakestore-product-source.js';
import { FAKE_BASE_URL, fakeStoreServer, readRawSnapshot, respondWith } from '../../test-support/fixtures.js';
import { testApp } from '../../test-support/test-app.js';

const NOT_FOUND = { error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } };

describe('GET /api/products/:id (F4)', () => {
  it('returns the product in the API model', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/products/3');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: '3',
      title: 'Mens Cotton Jacket',
      description: expect.stringContaining('great outerwear jackets'),
      price: 55.99,
      imageUrl: expect.stringMatching(/^https:\/\//),
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      rating: { rate: 4.7, count: 500 },
    });
  });

  it('returns 404 in the error shape for an unknown id', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/products/999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual(NOT_FOUND);
  });

  it.each(['abc%20def', '..%2F..%2Fusers', '1%2F2', 'x'.repeat(65), '3%3Bdrop'])(
    'returns 404 for the impossible id %s without calling Fake Store',
    async (id) => {
      const fetch = fakeStoreServer(readRawSnapshot());
      const { app } = testApp({
        products: new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch }),
      });

      const response = await request(app).get(`/api/products/${id}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual(NOT_FOUND);
      expect(fetch.requestedUrls).toEqual([]);
    },
  );

  it('works end to end through the real Fake Store adapter: one GET /products/{id}, empty body means 404', async () => {
    const fetch = fakeStoreServer(readRawSnapshot());
    const { app } = testApp({
      products: new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch }),
    });

    const found = await request(app).get('/api/products/7');
    const missing = await request(app).get('/api/products/999');

    expect(found.status).toBe(200);
    expect(found.body).toMatchObject({ id: '7', title: 'White Gold Plated Princess', category: { slug: 'jewellery' } });
    expect(missing.status).toBe(404);
    expect(fetch.requestedUrls).toEqual([`${FAKE_BASE_URL}/products/7`, `${FAKE_BASE_URL}/products/999`]);
  });

  it('answers 502 when Fake Store fails', async () => {
    const { app } = testApp({
      products: new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch: respondWith('oops', 500) }),
    });

    const response = await request(app).get('/api/products/3');

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
