import type { ApiErrorBody } from './types';

/**
 * The only module that calls `fetch`. Feature slices add one typed function per
 * endpoint (e.g. `getFeaturedProducts`) on top of `getJson` / `postJson`.
 */

/** Every API path starts here; the dev proxy and nginx forward it to the server. */
export const API_BASE = '/api';

/** Anything that went wrong talking to the API, in one shape the pages can show. */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    /** HTTP status, or 0 when the server could not be reached. */
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { method: 'GET', ...(signal === undefined ? {} : { signal }) });
}

export function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal === undefined ? {} : { signal }),
  });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  // Absolute URL on the page's own origin: same request in the browser and in tests.
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (isApiErrorBody(body)) {
      return new ApiError(response.status, body.error.code, body.error.message, body.error.details);
    }
  } catch {
    // Not JSON (e.g. a proxy error page): fall through to a generic error.
  }
  return new ApiError(response.status, 'HTTP_ERROR', 'Something went wrong. Please try again.');
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const { error } = value;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/** True when the request was cancelled on purpose (e.g. the page was left), so callers can ignore it. */
export function isAbortError(error: unknown): boolean {
  // Checked by name, not `instanceof DOMException`: browsers, Node and jsdom each have their own DOMException.
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}
