import { setupServer } from 'msw/node';

/**
 * Fake API for tests: each test registers the `/api` responses it needs with
 * `server.use(...)`. A request without a handler is blocked and fails the test
 * (see setup.ts), so no test can reach a real server.
 */
export const server = setupServer();

/** The absolute URL the API client requests for `path`, for use in MSW handlers. */
export function apiUrl(path: string): string {
  return new URL(`/api${path}`, window.location.origin).href;
}
