import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { FakeStoreProductSource } from '../../adapters/fakestore/fakestore-product-source.js';
import { FAKE_BASE_URL, fakeStoreServer, readRawSnapshot, respondWith } from '../../test-support/fixtures.js';
import { testApp } from '../../test-support/test-app.js';

const PRODUCT_KEYS = ['category', 'description', 'id', 'imageUrl', 'price', 'rating', 'title'];

describe('GET /api/featured-products (F1)', () => {
  it('returns exactly the 5 configured products, in the configured order', async () => {
    const { app } = testApp({ featuredIds: ['12', '11', '3', '18', '5'] });

    const response = await request(app).get('/api/featured-products');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body.map((product: { id: string }) => product.id)).toEqual(['12', '11', '3', '18', '5']);
  });

  it('returns the API model, not the Fake Store shape', async () => {
    const { app } = testApp();

    const response = await request(app).get('/api/featured-products');

    for (const product of response.body) {
      expect(Object.keys(product).sort()).toEqual(PRODUCT_KEYS);
    }
    expect(response.body[2]).toEqual({
      id: '3',
      title: 'Mens Cotton Jacket',
      description: expect.any(String),
      price: 55.99,
      imageUrl: expect.stringMatching(/^https:\/\//),
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      rating: { rate: 4.7, count: 500 },
    });
  });

  it('skips a configured id that no longer exists, still answering 200', async () => {
    const { app, logger } = testApp({ featuredIds: ['12', '999', '3', '18', '5'] });

    const response = await request(app).get('/api/featured-products');

    expect(response.status).toBe(200);
    expect(response.body.map((product: { id: string }) => product.id)).toEqual(['12', '3', '18', '5']);
    expect(logger.lines('warn')).toEqual(['Featured product ids not found in the product source: 999']);
  });

  it('works end to end through the real Fake Store adapter (fake fetch, recorded response)', async () => {
    const fetch = fakeStoreServer(readRawSnapshot());
    const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch });
    const { app } = testApp({ products });

    const response = await request(app).get('/api/featured-products');

    expect(response.status).toBe(200);
    expect(response.body.map((product: { id: string }) => product.id)).toEqual(['12', '11', '3', '18', '5']);
    expect(fetch.requestedUrls).toEqual([`${FAKE_BASE_URL}/products`]);
  });

  it('answers 502 in the error shape when Fake Store fails', async () => {
    const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch: respondWith('oops', 500) });
    const { app, logger } = testApp({ products });

    const response = await request(app).get('/api/featured-products');

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'A service this request depends on is unavailable. Please try again.',
      },
    });
    expect(logger.lines('warn').join('\n')).toContain('HTTP 500');
  });
});
