import { useCallback, useEffect, useState } from 'react';
import { ApiError, isAbortError } from './client';

export type ApiData<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: ApiError };

export type ApiDataResult<T> = ApiData<T> & {
  /** Loads again, e.g. from an error state's "Try again" button. */
  readonly retry: () => void;
};

/**
 * Loads data for a page and tracks loading, success and error.
 *
 * `key` identifies the request (e.g. "featured-products", or "product/3" later):
 * when it changes, the previous request is cancelled and a new one starts. A
 * request still running when the page is left is cancelled too, so a late
 * response never updates a page that is gone.
 */
export function useApiData<T>(key: string, load: (signal: AbortSignal) => Promise<T>): ApiDataResult<T> {
  const [state, setState] = useState<ApiData<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setState({ status: 'success', data });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setState({ status: 'error', error: toApiError(error) });
      },
    );

    return () => controller.abort();
    // `load` is deliberately not a dependency: `key` says which request this is,
    // so a new function identity on every render must not trigger a reload.
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, 'UNEXPECTED_ERROR', 'Something went wrong. Please try again.');
}
