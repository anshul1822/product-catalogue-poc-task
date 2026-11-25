import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { testApp } from './test-support/test-app.js';

const { app } = testApp();

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('security headers', () => {
  it('sets helmet headers and hides the framework', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('unknown routes', () => {
  it.each(['/api/nope', '/nope', '/'])('GET %s returns 404 in the error shape', async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  it('a wrong method on a known path is also 404', async () => {
    const response = await request(app).delete('/api/health');

    expect(response.status).toBe(404);
  });
});

describe('request bodies', () => {
  it('rejects malformed JSON with 400', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('content-type', 'application/json')
      .send('{"name": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
    expect(JSON.stringify(response.body)).not.toContain('SyntaxError');
  });

  it('rejects a JSON body over 10 kB with 413', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ message: 'x'.repeat(11 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
