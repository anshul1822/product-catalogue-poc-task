import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Category } from '../api/types';

/** The absolute URL the API client requests for `path`, for use in MSW handlers. */
export function apiUrl(path: string): string {
  return new URL(`/api${path}`, window.location.origin).href;
}

/** What the header's category links load unless a test says otherwise. */
export const DEFAULT_CATEGORIES: Category[] = [
  { slug: 'mens-clothing', name: "Men's Clothing" },
  { slug: 'jewellery', name: 'Jewellery' },
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'womens-clothing', name: "Women's Clothing" },
];

/**
 * Fake API for tests. The header asks for the categories on every page, so that
 * one response is a default handler (restored after each test). Everything else
 * is registered per test with `server.use(...)`. A request without a handler is
 * blocked and fails the test (see setup.ts), so no test can reach a real server.
 */
export const server = setupServer(http.get(apiUrl('/categories'), () => HttpResponse.json(DEFAULT_CATEGORIES)));
