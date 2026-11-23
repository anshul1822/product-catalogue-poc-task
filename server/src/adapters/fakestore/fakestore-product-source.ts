import type { z } from 'zod';
import {
  deriveCategories,
  filterByCategory,
  pickByIds,
  searchProducts,
} from '../../domain/catalogue-queries.js';
import { UpstreamError } from '../../domain/errors.js';
import type { Category, Product } from '../../domain/product.js';
import type { ProductSource } from '../../ports/product-source.js';
import { toProduct } from './mapper.js';
import { fakeStoreProductListSchema, fakeStoreProductSchema } from './schema.js';

const SOURCE = 'fakestore';

/** Fake Store ids are positive integers; anything else cannot exist upstream. */
const PRODUCT_ID_PATTERN = /^[1-9]\d{0,9}$/;

/** The subset of `fetch` this adapter needs; tests inject a fake. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface FakeStoreOptions {
  /** e.g. "https://fakestoreapi.com" (a trailing slash is allowed). */
  readonly baseUrl: string;
  /** Applies to the whole request, including reading the body. */
  readonly timeoutMs: number;
  readonly fetch?: FetchLike;
}

type ResponseBody = { readonly empty: true } | { readonly empty: false; readonly json: unknown };

/**
 * `ProductSource` backed by the Fake Store API.
 *
 * Fake Store facts this relies on (checked against the live API):
 * - there is no search endpoint, so search runs over `GET /products`;
 * - an unknown id returns HTTP 200 with an empty body, not 404.
 */
export class FakeStoreProductSource implements ProductSource {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchLike;

  constructor(options: FakeStoreOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs;
    this.fetchFn = options.fetch ?? ((url, init) => fetch(url, init));
  }

  async getAll(): Promise<Product[]> {
    const body = await this.get('/products');
    if (body.empty) {
      throw new UpstreamError(SOURCE, 'GET /products returned an empty body');
    }
    return this.parse(fakeStoreProductListSchema, body.json, '/products').map(toProduct);
  }

  async getById(id: string): Promise<Product | null> {
    if (!PRODUCT_ID_PATTERN.test(id)) {
      return null;
    }
    const path = `/products/${id}`;
    const body = await this.get(path);
    if (body.empty) {
      return null;
    }
    return toProduct(this.parse(fakeStoreProductSchema, body.json, path));
  }

  async getByIds(ids: readonly string[]): Promise<Product[]> {
    return pickByIds(await this.getAll(), ids);
  }

  async getCategories(): Promise<Category[]> {
    return deriveCategories(await this.getAll());
  }

  async getByCategory(slug: string): Promise<Product[] | null> {
    return filterByCategory(await this.getAll(), slug);
  }

  async search(term: string): Promise<Product[]> {
    return searchProducts(await this.getAll(), term);
  }

  private async get(path: string): Promise<ResponseBody> {
    const signal = AbortSignal.timeout(this.timeoutMs);
    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        signal,
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        throw new UpstreamError(SOURCE, `GET ${path} returned HTTP ${response.status}`);
      }
      const text = await response.text();
      if (text.trim() === '') {
        return { empty: true };
      }
      return { empty: false, json: JSON.parse(text) as unknown };
    } catch (error) {
      if (error instanceof UpstreamError) {
        throw error;
      }
      throw new UpstreamError(SOURCE, `GET ${path} failed: ${describeFailure(error, this.timeoutMs)}`, {
        cause: error,
      });
    }
  }

  private parse<T>(schema: z.ZodType<T>, json: unknown, path: string): T {
    const result = schema.safeParse(json);
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue === undefined ? '' : ` at ${issue.path.join('.') || '(root)'}: ${issue.message}`;
      throw new UpstreamError(SOURCE, `GET ${path} returned unexpected data${where}`, {
        cause: result.error,
      });
    }
    return result.data;
  }
}

function describeFailure(error: unknown, timeoutMs: number): string {
  if (error instanceof SyntaxError) {
    return 'invalid JSON';
  }
  if (isNamedError(error, 'TimeoutError')) {
    return `timed out after ${timeoutMs} ms`;
  }
  return 'network error';
}

function isNamedError(error: unknown, name: string): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === name;
}
