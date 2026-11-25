import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FetchLike } from '../adapters/fakestore/fakestore-product-source.js';
import { toProduct } from '../adapters/fakestore/mapper.js';
import { fakeStoreProductListSchema } from '../adapters/fakestore/schema.js';
import type { Product } from '../domain/product.js';
import type { Logger } from '../logger.js';

/**
 * Test-only helpers. Excluded from the build; the running app never reads anything here.
 * Products always come from the live Fake Store API at runtime.
 */

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
/** The raw Fake Store `/products` response, recorded by `npm run snapshot`, so tests need no network. */
export const RAW_SNAPSHOT_PATH = fileURLToPath(new URL('fakestore-products.json', import.meta.url));

export const FAKE_BASE_URL = 'https://fakestore.test';

/** The raw Fake Store `/products` response recorded by `npm run snapshot`. */
export function readRawSnapshot(): Array<Record<string, unknown>> {
  return JSON.parse(readFileSync(RAW_SNAPSHOT_PATH, 'utf8')) as Array<Record<string, unknown>>;
}

/** The recorded snapshot as domain products, through the real Fake Store schema and mapper. */
export function snapshotProducts(): Product[] {
  return fakeStoreProductListSchema.parse(readRawSnapshot()).map(toProduct);
}

export interface RecordingFetch extends FetchLike {
  readonly requestedUrls: string[];
}

/** A fake `fetch` that always answers with the given body and status. */
export function respondWith(body: string, status = 200): RecordingFetch {
  const requestedUrls: string[] = [];
  const fake = (url: string): Promise<Response> => {
    requestedUrls.push(url);
    return Promise.resolve(new Response(body, { status }));
  };
  return Object.assign(fake, { requestedUrls });
}

/**
 * A fake Fake Store server over `rawProducts`, mimicking the live API:
 * `GET /products`, `GET /products/{id}`, and HTTP 200 with an empty body for an unknown id.
 */
export function fakeStoreServer(rawProducts: ReadonlyArray<Record<string, unknown>>): RecordingFetch {
  const requestedUrls: string[] = [];
  const fake = (url: string): Promise<Response> => {
    requestedUrls.push(url);
    const { pathname } = new URL(url);
    if (pathname === '/products') {
      return Promise.resolve(new Response(JSON.stringify(rawProducts), { status: 200 }));
    }
    const match = /^\/products\/(\d+)$/.exec(pathname);
    if (match !== null) {
      const item = rawProducts.find((raw) => String(raw['id']) === match[1]);
      return Promise.resolve(new Response(item === undefined ? '' : JSON.stringify(item), { status: 200 }));
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }));
  };
  return Object.assign(fake, { requestedUrls });
}

type LogLevel = 'info' | 'warn' | 'error';

export interface RecordingLogger extends Logger {
  /** What was logged at `level`, one string per call. */
  lines(level: LogLevel): string[];
}

/** A logger that keeps output out of the test run and lets tests check what was logged. */
export function recordingLogger(): RecordingLogger {
  const entries: Array<{ level: LogLevel; text: string }> = [];
  const record =
    (level: LogLevel) =>
    (...args: unknown[]): void => {
      entries.push({ level, text: args.map(formatLogArg).join(' ') });
    };
  return {
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    lines: (level) => entries.filter((entry) => entry.level === level).map((entry) => entry.text),
  };
}

function formatLogArg(arg: unknown): string {
  return arg instanceof Error ? `${arg.name}: ${arg.message}` : String(arg);
}

/** Builds a domain product for unit tests; override only what the test cares about. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '1',
    title: 'Plain Notebook',
    description: 'A5 lined notebook',
    price: 4.5,
    imageUrl: 'https://images.test/notebook.png',
    category: { slug: 'stationery', name: 'Stationery' },
    rating: { rate: 4, count: 10 },
    ...overrides,
  };
}
