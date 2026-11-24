import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiUrl, server } from '../test-support/server';
import { ApiError, getJson, isAbortError, postJson } from './client';

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the promise to reject');
}

describe('getJson', () => {
  it('requests /api on the page origin and returns the JSON body', async () => {
    let accept: string | null = null;
    server.use(
      http.get(apiUrl('/health'), ({ request }) => {
        accept = request.headers.get('accept');
        return HttpResponse.json({ status: 'ok' });
      }),
    );

    await expect(getJson<{ status: string }>('/health')).resolves.toEqual({ status: 'ok' });
    expect(accept).toBe('application/json');
  });

  it('turns the API error shape into an ApiError with status, code, message and details', async () => {
    server.use(
      http.get(apiUrl('/products/999'), () =>
        HttpResponse.json(
          { error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.', details: { id: '999' } } },
          { status: 404 },
        ),
      ),
    );

    const error = await rejection(getJson('/products/999'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product not found.',
      details: { id: '999' },
    });
  });

  it('uses a generic ApiError when the error body is not the API shape', async () => {
    server.use(http.get(apiUrl('/health'), () => new HttpResponse('<html>Bad gateway</html>', { status: 502 })));

    const error = await rejection(getJson('/health'));

    expect(error).toMatchObject({ status: 502, code: 'HTTP_ERROR', message: 'Something went wrong. Please try again.' });
  });

  it('reports a network failure as NETWORK_ERROR with status 0', async () => {
    server.use(http.get(apiUrl('/health'), () => HttpResponse.error()));

    const error = await rejection(getJson('/health'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('lets a cancelled request reject as an abort, not as an ApiError', async () => {
    server.use(http.get(apiUrl('/health'), () => HttpResponse.json({ status: 'ok' })));
    const controller = new AbortController();
    controller.abort();

    const error = await rejection(getJson('/health', controller.signal));

    expect(error).not.toBeInstanceOf(ApiError);
    expect(isAbortError(error)).toBe(true);
  });
});

describe('postJson', () => {
  it('sends the body as JSON and returns the response body', async () => {
    let received: unknown = null;
    let contentType: string | null = null;
    server.use(
      http.post(apiUrl('/echo'), async ({ request }) => {
        contentType = request.headers.get('content-type');
        received = await request.json();
        return HttpResponse.json({ ok: true }, { status: 201 });
      }),
    );

    await expect(postJson('/echo', { name: 'Ada' })).resolves.toEqual({ ok: true });
    expect(contentType).toBe('application/json');
    expect(received).toEqual({ name: 'Ada' });
  });
});
