import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UpstreamError } from '../domain/errors.js';
import { recordingLogger } from '../test-support/fixtures.js';
import { ApiError, errorBody, errorHandler, notFoundHandler } from './errors.js';

/** A tiny app whose routes throw, so the handlers are tested without any feature code. */
function appThatThrows() {
  const logger = recordingLogger();
  const app = express();
  app.get('/api-error', () => {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Check the highlighted fields.', { email: 'Enter a valid email' });
  });
  app.get('/not-found', () => {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  });
  app.get('/upstream', async () => {
    throw new UpstreamError('fakestore', 'GET /products returned HTTP 500');
  });
  app.get('/bug', () => {
    throw new TypeError('Cannot read properties of undefined (secret internals)');
  });
  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return { app, logger };
}

describe('errorHandler', () => {
  it('renders an ApiError with its status, code, message and details', async () => {
    const { app } = appThatThrows();

    const response = await request(app).get('/api-error');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Check the highlighted fields.',
        details: { email: 'Enter a valid email' },
      },
    });
  });

  it('omits details when there are none', async () => {
    const { app } = appThatThrows();

    const response = await request(app).get('/not-found');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } });
  });

  it('maps an UpstreamError (also from an async handler) to 502 without leaking the upstream message', async () => {
    const { app, logger } = appThatThrows();

    const response = await request(app).get('/upstream');

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('fakestore');
    expect(logger.lines('warn').join('\n')).toContain('GET /products returned HTTP 500');
  });

  it('maps any other error to 500 with a generic message, logging the details on the server only', async () => {
    const { app, logger } = appThatThrows();

    const response = await request(app).get('/bug');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
    expect(JSON.stringify(response.body)).not.toContain('secret internals');
    expect(logger.lines('error').join('\n')).toContain('secret internals');
  });
});

describe('errorBody', () => {
  it('builds the shared shape', () => {
    expect(errorBody('NOT_FOUND', 'Route not found')).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
});
