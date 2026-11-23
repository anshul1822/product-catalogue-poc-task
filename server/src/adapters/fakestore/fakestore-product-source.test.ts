import { describe, expect, it } from 'vitest';
import { UpstreamError } from '../../domain/errors.js';
import { FAKE_BASE_URL, fakeStoreServer, readRawSnapshot, respondWith } from '../../test-support/fixtures.js';
import { FakeStoreProductSource, type FetchLike } from './fakestore-product-source.js';

function sourceWith(fetch: FetchLike, timeoutMs = 1_000): FakeStoreProductSource {
  return new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs, fetch });
}

describe('FakeStoreProductSource', () => {
  describe('requests', () => {
    it('calls GET {baseUrl}/products/{id} and tolerates a trailing slash on the base URL', async () => {
      const fetch = fakeStoreServer(readRawSnapshot());
      const source = new FakeStoreProductSource({ baseUrl: `${FAKE_BASE_URL}/`, timeoutMs: 1_000, fetch });

      const product = await source.getById('7');

      expect(product?.title).toBe('White Gold Plated Princess');
      expect(fetch.requestedUrls).toEqual([`${FAKE_BASE_URL}/products/7`]);
    });

    it.each(['abc', '0', '-1', '1.5', '1/../../users', '', '12345678901'])(
      'returns null for the impossible id %j without calling upstream',
      async (id) => {
        const fetch = fakeStoreServer(readRawSnapshot());

        await expect(sourceWith(fetch).getById(id)).resolves.toBeNull();
        expect(fetch.requestedUrls).toEqual([]);
      },
    );
  });

  describe('not found', () => {
    it('treats HTTP 200 with an empty body as not found (live Fake Store behaviour)', async () => {
      await expect(sourceWith(respondWith('')).getById('999')).resolves.toBeNull();
    });
  });

  describe('failures throw UpstreamError', () => {
    it('on a non-2xx status', async () => {
      const error = await sourceWith(respondWith('oops', 500)).getAll().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamError);
      expect((error as UpstreamError).message).toContain('HTTP 500');
    });

    it('on a 404 for a single product (not treated as "not found": the route itself is wrong)', async () => {
      await expect(sourceWith(respondWith('Not Found', 404)).getById('1')).rejects.toBeInstanceOf(
        UpstreamError,
      );
    });

    it('on a network error, keeping the cause', async () => {
      const cause = new TypeError('fetch failed');
      const failing: FetchLike = () => Promise.reject(cause);

      const error = await sourceWith(failing).getAll().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamError);
      expect((error as UpstreamError).message).toContain('network error');
      expect((error as UpstreamError).cause).toBe(cause);
    });

    it('on a timeout', async () => {
      const hanging: FetchLike = (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        });

      const error = await sourceWith(hanging, 20).getAll().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamError);
      expect((error as UpstreamError).message).toContain('timed out after 20 ms');
    });

    it('on invalid JSON', async () => {
      const error = await sourceWith(respondWith('<html>busy</html>')).getAll().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamError);
      expect((error as UpstreamError).message).toContain('invalid JSON');
    });

    it('on an empty body for the product list', async () => {
      await expect(sourceWith(respondWith('')).getAll()).rejects.toBeInstanceOf(UpstreamError);
    });

    it('on data that does not match the expected shape', async () => {
      const [first] = readRawSnapshot();
      const broken = [{ ...first, price: 'free' }];

      const error = await sourceWith(respondWith(JSON.stringify(broken))).getAll().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UpstreamError);
      expect((error as UpstreamError).message).toContain('unexpected data at 0.price');
    });

    it('on a non-http image URL', async () => {
      const [first] = readRawSnapshot();
      const broken = [{ ...first, image: 'javascript:alert(1)' }];

      await expect(sourceWith(respondWith(JSON.stringify(broken))).getAll()).rejects.toBeInstanceOf(
        UpstreamError,
      );
    });
  });
});
