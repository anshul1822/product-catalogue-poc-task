import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UpstreamError } from '../../domain/errors.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PostgresEnquiryRepository } from './postgres-enquiry-repository.js';

/**
 * Runs against a real PostgreSQL only when TEST_DATABASE_URL is set, so `npm test`
 * needs no database. With Docker Compose running (host port 55432):
 *
 *   $env:TEST_DATABASE_URL = 'postgresql://catalogue:catalogue@localhost:55432/catalogue'
 *   npx vitest run src/adapters/enquiry-postgres
 *
 * The migrations must have run (the Compose `migrate` service does that). Rows
 * written here use a reserved test domain and are deleted afterwards.
 */
const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'];
const TEST_EMAIL = 'repository-test@example.invalid';

describe.skipIf(TEST_DATABASE_URL === undefined)('PostgresEnquiryRepository (real PostgreSQL)', () => {
  let prisma: PrismaClient;
  let repository: PostgresEnquiryRepository;

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL ?? '' }) });
    repository = new PostgresEnquiryRepository(prisma);
    await prisma.enquiry.deleteMany({ where: { customerEmail: TEST_EMAIL } });
  });

  afterAll(async () => {
    await prisma.enquiry.deleteMany({ where: { customerEmail: TEST_EMAIL } });
    await repository.disconnect();
  });

  const NEW_ENQUIRY = {
    productId: '3',
    productTitle: 'Mens Cotton Jacket',
    productPrice: 55.99,
    customerName: 'Ada Lovelace',
    customerEmail: TEST_EMAIL,
    customerPhone: '+61 2 9876 5432',
    message: 'Is it waterproof?\nThanks.',
  };

  it('stores a new enquiry as PENDING and reads it back exactly', async () => {
    const stored = await repository.create(NEW_ENQUIRY);

    expect(stored).toMatchObject({ ...NEW_ENQUIRY, status: 'PENDING', failureReason: null, sentAt: null });
    expect(stored.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored.createdAt).toBeInstanceOf(Date);
  });

  it('marks it SENT, then a second one FAILED, in the database', async () => {
    const sent = await repository.create(NEW_ENQUIRY);
    const failed = await repository.create(NEW_ENQUIRY);
    const sentAt = new Date('2026-11-24T10:00:01.000Z');

    await repository.markSent(sent.id, sentAt);
    await repository.markFailed(failed.id, 'smtp: ECONNREFUSED');

    const rows = await prisma.enquiry.findMany({ where: { id: { in: [sent.id, failed.id] } } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(sent.id)).toMatchObject({ status: 'SENT', sentAt });
    expect(byId.get(failed.id)).toMatchObject({ status: 'FAILED', failureReason: 'smtp: ECONNREFUSED', sentAt: null });
  });

  it('keeps the price as an exact decimal', async () => {
    const stored = await repository.create({ ...NEW_ENQUIRY, productPrice: 0.1 + 0.2 });

    expect(stored.productPrice).toBe(0.3);
  });

  it('turns a database error into UpstreamError', async () => {
    await expect(repository.markSent('00000000-0000-0000-0000-000000000000', new Date())).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('PostgresEnquiryRepository (no database)', () => {
  it('turns a connection failure into UpstreamError without leaking connection details', async () => {
    const repository = PostgresEnquiryRepository.fromUrl('postgresql://nobody:secret@127.0.0.1:9/none');

    const error = await repository
      .create({
        productId: '3',
        productTitle: 'Mens Cotton Jacket',
        productPrice: 55.99,
        customerName: 'Ada',
        customerEmail: 'ada@example.com',
        customerPhone: null,
        message: null,
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).message).toMatch(/^\[postgres\] create failed: /);
    expect((error as UpstreamError).message).not.toContain('secret');
    await repository.disconnect();
  }, 20_000);
});
