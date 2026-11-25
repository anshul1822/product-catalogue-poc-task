/**
 * Re-records the test fixture `src/test-support/fakestore-products.json` from the live
 * Fake Store `GET /products` response. Tests replay it through a fake `fetch`, so they
 * need no network. The running app never reads this file: products always come from
 * the live API.
 *
 * Run with `npm run snapshot`, then re-run the tests: exact expectations (ids, counts)
 * may need updating if Fake Store's data has changed.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { FakeStoreProductSource } from '../src/adapters/fakestore/fakestore-product-source.js';

const BASE_URL = process.env['FAKESTORE_BASE_URL'] ?? 'https://fakestoreapi.com';
// Compiled to dist/scripts/, so the server root is two levels up.
const FIXTURE = new URL('../../src/test-support/fakestore-products.json', import.meta.url);

async function main(): Promise<void> {
  const response = await fetch(`${BASE_URL.replace(/\/+$/, '')}/products`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`GET /products returned HTTP ${response.status}`);
  }
  const rawText = await response.text();

  // Validate through the real adapter before recording, so a broken response never becomes a fixture.
  const products = await new FakeStoreProductSource({
    baseUrl: BASE_URL,
    timeoutMs: 15_000,
    fetch: () => Promise.resolve(new Response(rawText, { status: 200 })),
  }).getAll();

  const raw: unknown = JSON.parse(rawText);
  await writeFile(FIXTURE, `${JSON.stringify(raw, null, 2)}\n`);

  console.log(`Recorded ${products.length} products to ${fileURLToPath(FIXTURE)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
