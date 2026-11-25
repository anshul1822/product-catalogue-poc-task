import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

/**
 * Requests that had no MSW handler. MSW blocks them, but the API client turns a
 * blocked request into a NETWORK_ERROR, which a test could silently accept; so
 * they are collected here and fail the test in `afterEach`.
 */
const unhandledRequests: string[] = [];

beforeAll(() => {
  // MSW 3 calls this option onUnhandledFrame (v2: onUnhandledRequest).
  server.listen({ onUnhandledFrame: 'error' });
  server.events.on('request:unhandled', ({ request }) => {
    unhandledRequests.push(`${request.method} ${request.url}`);
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  if (unhandledRequests.length > 0) {
    const requests = unhandledRequests.splice(0);
    throw new Error(`Requests without an MSW handler (add one with server.use): ${requests.join(', ')}`);
  }
});

afterAll(() => server.close());
