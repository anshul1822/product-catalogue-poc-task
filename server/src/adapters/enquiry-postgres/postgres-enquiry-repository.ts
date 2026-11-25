import { PrismaPg } from '@prisma/adapter-pg';
import { UpstreamError } from '../../domain/errors.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { EnquiryRepository, NewEnquiry, StoredEnquiry } from '../../ports/enquiry-repository.js';

const SOURCE = 'postgres';

/** The row shape this adapter reads back; Prisma types stay inside this folder. */
interface EnquiryRow {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: { toString(): string };
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  message: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
  failureReason: string | null;
  createdAt: Date;
  sentAt: Date | null;
}

/** Longest failure reason stored; matches the column size. */
const MAX_FAILURE_REASON = 500;

/**
 * `EnquiryRepository` on PostgreSQL through Prisma 7 and the `pg` driver adapter.
 * The `enquiries` table is created by the migration in `prisma/migrations/`.
 * Every database error becomes `UpstreamError`; Prisma's own errors and types
 * never leave this file.
 */
export class PostgresEnquiryRepository implements EnquiryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Builds the repository with its own connection pool. Prisma connects on first use. */
  static fromUrl(databaseUrl: string): PostgresEnquiryRepository {
    return new PostgresEnquiryRepository(new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }));
  }

  async create(enquiry: NewEnquiry): Promise<StoredEnquiry> {
    const row = await this.run('create', () =>
      this.prisma.enquiry.create({
        data: {
          productId: enquiry.productId,
          productTitle: enquiry.productTitle,
          productPrice: enquiry.productPrice,
          customerName: enquiry.customerName,
          customerEmail: enquiry.customerEmail,
          customerPhone: enquiry.customerPhone,
          message: enquiry.message,
        },
      }),
    );
    return toStored(row);
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await this.run('markSent', () =>
      this.prisma.enquiry.update({ where: { id }, data: { status: 'SENT', sentAt, failureReason: null } }),
    );
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.run('markFailed', () =>
      this.prisma.enquiry.update({
        where: { id },
        data: { status: 'FAILED', failureReason: reason.slice(0, MAX_FAILURE_REASON) },
      }),
    );
  }

  /** Closes the connection pool; called on shutdown. */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  private async run<T>(operation: string, query: () => Promise<T>): Promise<T> {
    try {
      return await query();
    } catch (error) {
      throw new UpstreamError(SOURCE, `${operation} failed: ${describe(error)}`, { cause: error });
    }
  }
}

function toStored(row: EnquiryRow): StoredEnquiry {
  return {
    id: row.id,
    productId: row.productId,
    productTitle: row.productTitle,
    productPrice: Number(row.productPrice.toString()),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    message: row.message,
    status: row.status,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
  };
}

/** A short, PII-free description of a database error, for logs. */
function describe(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    const name = 'name' in error && typeof error.name === 'string' ? error.name : 'Error';
    return code === undefined ? name : `${name} ${code}`;
  }
  return 'unknown error';
}
