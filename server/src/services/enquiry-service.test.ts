import { describe, expect, it } from 'vitest';
import { MemoryEnquiryRepository } from '../adapters/enquiry-memory/memory-enquiry-repository.js';
import { InMemoryProductSource } from '../adapters/in-memory/in-memory-product-source.js';
import { UpstreamError } from '../domain/errors.js';
import type { NewEnquiry, StoredEnquiry } from '../ports/enquiry-repository.js';
import { recordingLogger, snapshotProducts } from '../test-support/fixtures.js';
import { ENQUIRY_SETTINGS, RecordingEmailSender } from '../test-support/test-app.js';
import { EnquiryService } from './enquiry-service.js';

const VALID = { productId: '3', name: 'Ada Lovelace', email: 'ada@example.com', phone: '0412 345 678', message: 'Is it waterproof?' };
const SENT_AT = new Date('2026-11-24T10:00:05.000Z');

function setup() {
  const repository = new MemoryEnquiryRepository(() => new Date('2026-11-24T10:00:00.000Z'));
  const email = new RecordingEmailSender();
  const logger = recordingLogger();
  const service = new EnquiryService({
    products: new InMemoryProductSource(snapshotProducts()),
    repository,
    email,
    logger,
    settings: ENQUIRY_SETTINGS,
    now: () => SENT_AT,
  });
  return { service, repository, email, logger };
}

describe('EnquiryService.submit (F5)', () => {
  it('saves the enquiry, emails the sales inbox once, and marks it SENT', async () => {
    const { service, repository, email } = setup();

    const result = await service.submit(VALID);

    const [stored] = repository.all();
    expect(result).toEqual({ outcome: 'sent', enquiryId: stored?.id });
    expect(stored).toMatchObject({
      productId: '3',
      productTitle: 'Mens Cotton Jacket',
      productPrice: 55.99,
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@example.com',
      customerPhone: '0412 345 678',
      message: 'Is it waterproof?',
      status: 'SENT',
      sentAt: SENT_AT,
    });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]).toMatchObject({
      to: 'sales@catalogue.test',
      from: 'no-reply@catalogue.test',
      replyTo: 'ada@example.com',
      subject: 'New enquiry: Mens Cotton Jacket (#3)',
    });
    expect(email.sent[0]?.text).toContain(`Enquiry id: ${stored?.id ?? ''}`);
    expect(email.sent[0]?.text).toContain('Link:       http://shop.test/products/3');
  });

  it('takes the product title and price from the product source, never from the client', async () => {
    const { service, repository, email } = setup();

    await service.submit({ ...VALID, productTitle: 'Free jacket', price: 0 });

    expect(repository.all()[0]).toMatchObject({ productTitle: 'Mens Cotton Jacket', productPrice: 55.99 });
    expect(email.sent[0]?.text).toContain('Price:      $55.99');
  });

  it('returns the field errors and saves and sends nothing for an invalid enquiry', async () => {
    const { service, repository, email } = setup();

    const result = await service.submit({ ...VALID, email: 'nope', name: '' });

    expect(result).toEqual({
      outcome: 'invalid',
      errors: { name: 'Enter your name.', email: 'Enter a valid email address, like name@example.com.' },
    });
    expect(repository.all()).toEqual([]);
    expect(email.sent).toEqual([]);
  });

  it('ignores a filled honeypot: nothing saved or sent', async () => {
    const { service, repository, email } = setup();

    await expect(service.submit({ ...VALID, website: 'https://spam.example' })).resolves.toEqual({ outcome: 'ignored' });
    expect(repository.all()).toEqual([]);
    expect(email.sent).toEqual([]);
  });

  it('answers product-not-found for an unknown product: nothing saved or sent', async () => {
    const { service, repository, email } = setup();

    await expect(service.submit({ ...VALID, productId: '999' })).resolves.toEqual({ outcome: 'product-not-found' });
    expect(repository.all()).toEqual([]);
    expect(email.sent).toEqual([]);
  });

  it('keeps the enquiry as FAILED with the reason when the email fails, and rethrows', async () => {
    const { service, repository, email, logger } = setup();
    email.failing = true;

    const error = await service.submit(VALID).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect(repository.all()).toHaveLength(1);
    expect(repository.all()[0]).toMatchObject({ status: 'FAILED', failureReason: '[smtp] sending failed: ECONNECTION', sentAt: null });
    expect(logger.lines('warn').join('\n')).toContain('saved as FAILED');
  });

  it('sends no email when the store fails, so every email has a record', async () => {
    const { email, logger } = setup();
    const service = new EnquiryService({
      products: new InMemoryProductSource(snapshotProducts()),
      repository: new FailingRepository('create'),
      email,
      logger,
      settings: ENQUIRY_SETTINGS,
    });

    await expect(service.submit(VALID)).rejects.toBeInstanceOf(UpstreamError);
    expect(email.sent).toEqual([]);
  });

  it('still reports "sent" when the email went out but marking it SENT failed (no duplicate on retry)', async () => {
    const { email, logger } = setup();
    const service = new EnquiryService({
      products: new InMemoryProductSource(snapshotProducts()),
      repository: new FailingRepository('markSent'),
      email,
      logger,
      settings: ENQUIRY_SETTINGS,
    });

    await expect(service.submit(VALID)).resolves.toMatchObject({ outcome: 'sent' });
    expect(email.sent).toHaveLength(1);
    expect(logger.lines('error').join('\n')).toContain('could not be marked SENT');
  });

  it('never logs the customer’s details', async () => {
    const { service, email, logger } = setup();
    await service.submit(VALID);
    email.failing = true;
    await service.submit(VALID).catch(() => undefined);

    const logged = [...logger.lines('info'), ...logger.lines('warn'), ...logger.lines('error')].join('\n');
    for (const personal of ['Ada Lovelace', 'ada@example.com', '0412 345 678', 'Is it waterproof?']) {
      expect(logged).not.toContain(personal);
    }
  });
});

/** A repository whose database fails on one operation. */
class FailingRepository extends MemoryEnquiryRepository {
  constructor(private readonly failOn: 'create' | 'markSent') {
    super();
  }

  override create(enquiry: NewEnquiry): Promise<StoredEnquiry> {
    return this.failOn === 'create' ? Promise.reject(new UpstreamError('postgres', 'create failed')) : super.create(enquiry);
  }

  override markSent(id: string, sentAt: Date): Promise<void> {
    return this.failOn === 'markSent' ? Promise.reject(new UpstreamError('postgres', 'markSent failed')) : super.markSent(id, sentAt);
  }
}
