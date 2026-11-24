import { describe, expect, it } from 'vitest';
import type { NewEnquiry } from '../../ports/enquiry-repository.js';
import { MemoryEnquiryRepository } from './memory-enquiry-repository.js';

const NEW_ENQUIRY: NewEnquiry = {
  productId: '3',
  productTitle: 'Mens Cotton Jacket',
  productPrice: 55.99,
  customerName: 'Ada Lovelace',
  customerEmail: 'ada@example.com',
  customerPhone: null,
  message: 'Is it waterproof?',
};

describe('MemoryEnquiryRepository', () => {
  const now = new Date('2026-11-24T10:00:00.000Z');

  it('stores a new enquiry as PENDING with an id and the creation time', async () => {
    const repository = new MemoryEnquiryRepository(() => now);

    const stored = await repository.create(NEW_ENQUIRY);

    expect(stored).toEqual({ ...NEW_ENQUIRY, id: expect.any(String), status: 'PENDING', failureReason: null, createdAt: now, sentAt: null });
    expect(repository.all()).toEqual([stored]);
  });

  it('gives every enquiry its own id', async () => {
    const repository = new MemoryEnquiryRepository();

    const first = await repository.create(NEW_ENQUIRY);
    const second = await repository.create(NEW_ENQUIRY);

    expect(first.id).not.toBe(second.id);
  });

  it('marks an enquiry SENT with the time it was sent', async () => {
    const repository = new MemoryEnquiryRepository();
    const { id } = await repository.create(NEW_ENQUIRY);
    const sentAt = new Date('2026-11-24T10:00:01.000Z');

    await repository.markSent(id, sentAt);

    expect(repository.all()[0]).toMatchObject({ status: 'SENT', sentAt, failureReason: null });
  });

  it('marks an enquiry FAILED with the reason', async () => {
    const repository = new MemoryEnquiryRepository();
    const { id } = await repository.create(NEW_ENQUIRY);

    await repository.markFailed(id, 'smtp: ECONNREFUSED');

    expect(repository.all()[0]).toMatchObject({ status: 'FAILED', failureReason: 'smtp: ECONNREFUSED', sentAt: null });
  });
});
