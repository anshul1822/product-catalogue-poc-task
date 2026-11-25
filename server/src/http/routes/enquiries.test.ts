import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { MemoryEnquiryRepository } from '../../adapters/enquiry-memory/memory-enquiry-repository.js';
import { FakeStoreProductSource } from '../../adapters/fakestore/fakestore-product-source.js';
import { FAKE_BASE_URL, respondWith } from '../../test-support/fixtures.js';
import { RecordingEmailSender, testApp } from '../../test-support/test-app.js';

const VALID = { productId: '3', name: 'Ada Lovelace', email: 'ada@example.com' };

function app(options: Parameters<typeof testApp>[0] = {}) {
  const repository = new MemoryEnquiryRepository();
  const email = new RecordingEmailSender();
  return { ...testApp({ repository, email, ...options }), repository, email };
}

describe('POST /api/enquiries (F5)', () => {
  it('answers 201, saves the enquiry as SENT and emails the sales inbox once', async () => {
    const { app: server, repository, email } = app();

    const response = await request(server).post('/api/enquiries').send({ ...VALID, message: 'Is it waterproof?' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ status: 'received' });
    expect(repository.all()).toMatchObject([{ productId: '3', customerEmail: 'ada@example.com', status: 'SENT' }]);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({ to: 'sales@catalogue.test', replyTo: 'ada@example.com' });
  });

  it('answers 400 with one message per invalid field, and saves and sends nothing', async () => {
    const { app: server, repository, email } = app();

    const response = await request(server).post('/api/enquiries').send({ productId: '3', name: '', email: 'x', phone: 'abc' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Check the highlighted fields.',
        details: {
          fields: {
            name: 'Enter your name.',
            email: 'Enter a valid email address, like name@example.com.',
            phone: 'Enter a phone number using digits, spaces and + ( ) - only.',
          },
        },
      },
    });
    expect(repository.all()).toEqual([]);
    expect(email.sent).toEqual([]);
  });

  it('rejects a header-injection attempt in the name or email', async () => {
    const { app: server, email } = app();

    const response = await request(server)
      .post('/api/enquiries')
      .send({ ...VALID, email: 'ada@example.com\r\nBcc: everyone@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields.email).toBe('Your email address must be on one line.');
    expect(email.sent).toEqual([]);
  });

  it('answers 400 for a JSON array: valid JSON, but not an enquiry object', async () => {
    const { app: server } = app();

    const response = await request(server).post('/api/enquiries').send([VALID]);

    expect(response.status).toBe(400);
    expect(response.body.error.details.fields).toEqual({ form: 'Send the enquiry as a JSON object.' });
  });

  it('answers 400 INVALID_JSON for a bare JSON string (the strict JSON parser rejects it first)', async () => {
    const { app: server } = app();

    const response = await request(server).post('/api/enquiries').set('content-type', 'application/json').send('"hello"');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('answers 201 for a filled honeypot, so a bot cannot tell, but saves and sends nothing', async () => {
    const { app: server, repository, email } = app();

    const response = await request(server).post('/api/enquiries').send({ ...VALID, website: 'https://spam.example' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ status: 'received' });
    expect(repository.all()).toEqual([]);
    expect(email.sent).toEqual([]);
  });

  it('answers 404 for an unknown product', async () => {
    const { app: server, repository } = app();

    const response = await request(server).post('/api/enquiries').send({ ...VALID, productId: '999' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } });
    expect(repository.all()).toEqual([]);
  });

  it('answers 502 when the email fails, keeping the enquiry as FAILED', async () => {
    const { app: server, repository, email } = app();
    email.failing = true;

    const response = await request(server).post('/api/enquiries').send(VALID);

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('smtp');
    expect(repository.all()).toMatchObject([{ status: 'FAILED' }]);
  });

  it('answers 502 when Fake Store is down, before saving anything', async () => {
    const products = new FakeStoreProductSource({ baseUrl: FAKE_BASE_URL, timeoutMs: 1_000, fetch: respondWith('oops', 500) });
    const { app: server, repository } = app({ products });

    const response = await request(server).post('/api/enquiries').send(VALID);

    expect(response.status).toBe(502);
    expect(repository.all()).toEqual([]);
  });

  it('answers 429 once one client has sent too many enquiries', async () => {
    const { app: server, email } = app({ enquiryRateLimit: { windowMs: 60_000, limit: 2 } });

    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      statuses.push((await request(server).post('/api/enquiries').send(VALID)).status);
    }
    const limited = await request(server).post('/api/enquiries').send(VALID);

    expect(statuses).toEqual([201, 201, 429]);
    expect(limited.body).toEqual({
      error: { code: 'TOO_MANY_REQUESTS', message: 'You have sent a lot of enquiries. Please wait a few minutes and try again.' },
    });
    expect(limited.headers['retry-after']).toBeDefined();
    expect(email.sent).toHaveLength(2);
  });

  it('limits per client: the address forwarded by the proxy (nginx) counts, not the proxy’s', async () => {
    const { app: server } = app({ enquiryRateLimit: { windowMs: 60_000, limit: 1 } });

    const first = await request(server).post('/api/enquiries').set('x-forwarded-for', '203.0.113.1').send(VALID);
    const otherClient = await request(server).post('/api/enquiries').set('x-forwarded-for', '203.0.113.2').send(VALID);
    const sameClient = await request(server).post('/api/enquiries').set('x-forwarded-for', '203.0.113.1').send(VALID);

    expect([first.status, otherClient.status, sameClient.status]).toEqual([201, 201, 429]);
  });

  it('does not rate-limit the rest of the API', async () => {
    const { app: server } = app({ enquiryRateLimit: { windowMs: 60_000, limit: 1 } });
    await request(server).post('/api/enquiries').send(VALID);
    await request(server).post('/api/enquiries').send(VALID);

    expect((await request(server).get('/api/health')).status).toBe(200);
  });
});
