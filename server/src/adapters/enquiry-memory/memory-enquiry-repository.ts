import { randomUUID } from 'node:crypto';
import type { EnquiryRepository, NewEnquiry, StoredEnquiry } from '../../ports/enquiry-repository.js';

/**
 * `EnquiryRepository` in memory: for tests and for running the API without
 * Docker (`ENQUIRY_STORE=memory`). Enquiries are lost when the process stops,
 * so config refuses it in production.
 */
export class MemoryEnquiryRepository implements EnquiryRepository {
  private readonly enquiries = new Map<string, StoredEnquiry>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  async create(enquiry: NewEnquiry): Promise<StoredEnquiry> {
    const stored: StoredEnquiry = {
      ...enquiry,
      id: randomUUID(),
      status: 'PENDING',
      failureReason: null,
      createdAt: this.now(),
      sentAt: null,
    };
    this.enquiries.set(stored.id, stored);
    return stored;
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    this.update(id, { status: 'SENT', sentAt, failureReason: null });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    this.update(id, { status: 'FAILED', failureReason: reason });
  }

  /** Every stored enquiry, oldest first. For tests. */
  all(): StoredEnquiry[] {
    return [...this.enquiries.values()];
  }

  private update(id: string, changes: Partial<StoredEnquiry>): void {
    const existing = this.enquiries.get(id);
    if (existing !== undefined) {
      this.enquiries.set(id, { ...existing, ...changes });
    }
  }
}
