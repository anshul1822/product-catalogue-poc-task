import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { useApiData } from './useApiData';

/** A request the test resolves or rejects by hand. */
function controllable<T>() {
  const signals: AbortSignal[] = [];
  let settle: { resolve: (value: T) => void; reject: (error: unknown) => void } | undefined;
  const load = (signal: AbortSignal) => {
    signals.push(signal);
    return new Promise<T>((resolve, reject) => {
      settle = { resolve, reject };
    });
  };
  return {
    load,
    signals,
    resolve: (value: T) => settle?.resolve(value),
    reject: (error: unknown) => settle?.reject(error),
  };
}

describe('useApiData', () => {
  it('starts loading, then holds the data', async () => {
    const request = controllable<string[]>();
    const { result } = renderHook(() => useApiData('items', request.load));

    expect(result.current.status).toBe('loading');
    await act(async () => request.resolve(['a', 'b']));

    expect(result.current).toMatchObject({ status: 'success', data: ['a', 'b'] });
  });

  it('keeps an ApiError as it is', async () => {
    const request = controllable<string[]>();
    const { result } = renderHook(() => useApiData('items', request.load));

    await act(async () => request.reject(new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'Try again later.')));

    expect(result.current).toMatchObject({ status: 'error', error: { status: 502, code: 'UPSTREAM_UNAVAILABLE' } });
  });

  it('turns any other failure into a generic ApiError, never leaking its message', async () => {
    const request = controllable<string[]>();
    const { result } = renderHook(() => useApiData('items', request.load));

    await act(async () => request.reject(new TypeError('internal detail')));

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error.message).toBe('Something went wrong. Please try again.');
    }
  });

  it('cancels the request when the component unmounts', () => {
    const request = controllable<string[]>();
    const { unmount } = renderHook(() => useApiData('items', request.load));

    unmount();

    expect(request.signals[0]?.aborted).toBe(true);
  });

  it('starts a new request when the key changes, cancelling the old one and ignoring its late answer', async () => {
    const first = controllable<string>();
    const second = controllable<string>();
    const { result, rerender } = renderHook(({ key }) => useApiData(key, key === 'one' ? first.load : second.load), {
      initialProps: { key: 'one' },
    });

    rerender({ key: 'two' });
    expect(first.signals[0]?.aborted).toBe(true);

    await act(async () => first.resolve('stale'));
    expect(result.current.status).toBe('loading');

    await act(async () => second.resolve('fresh'));
    expect(result.current).toMatchObject({ status: 'success', data: 'fresh' });
  });

  it('does not reload when only the function identity changes', () => {
    let calls = 0;
    const { rerender } = renderHook(() =>
      useApiData('items', () => {
        calls += 1;
        return new Promise<never>(() => undefined);
      }),
    );

    rerender();
    rerender();

    expect(calls).toBe(1);
  });

  it('retry loads again', async () => {
    const request = controllable<string>();
    const { result } = renderHook(() => useApiData('items', request.load));
    await act(async () => request.reject(new ApiError(0, 'NETWORK_ERROR', 'Offline.')));

    act(() => result.current.retry());

    await waitFor(() => expect(request.signals).toHaveLength(2));
    expect(result.current.status).toBe('loading');
    await act(async () => request.resolve('ok'));
    expect(result.current).toMatchObject({ status: 'success', data: 'ok' });
  });
});
