import type { EnquiryStatus } from '../domain/enquiry.js';

/** What is stored for a new enquiry: the customer's details and a snapshot of the product. */
export interface NewEnquiry {
  readonly productId: string;
  readonly productTitle: string;
  readonly productPrice: number;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly customerPhone: string | null;
  readonly message: string | null;
}

export interface StoredEnquiry extends NewEnquiry {
  readonly id: string;
  readonly status: EnquiryStatus;
  readonly failureReason: string | null;
  readonly createdAt: Date;
  readonly sentAt: Date | null;
}

/**
 * Where enquiries are kept: PostgreSQL (Prisma) in Docker, memory in tests and
 * local runs without Docker. The only data the app owns; products are never stored.
 *
 * Contract: any failure of the store throws `UpstreamError`.
 */
export interface EnquiryRepository {
  /** Saves a new enquiry with status PENDING and returns it with its id. */
  create(enquiry: NewEnquiry): Promise<StoredEnquiry>;
  markSent(id: string, sentAt: Date): Promise<void>;
  markFailed(id: string, reason: string): Promise<void>;
}
