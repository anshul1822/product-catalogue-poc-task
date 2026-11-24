import { ApiError, postJson } from './client';

/** What the enquiry form sends to `POST /api/enquiries`. */
export interface EnquiryRequest {
  readonly productId: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly message: string;
  /** Honeypot: hidden from people, empty unless a bot filled it. */
  readonly website: string;
}

export type EnquiryField = 'name' | 'email' | 'phone' | 'message';
export type EnquiryFieldErrors = Partial<Record<EnquiryField, string>>;

/** Same limits as the server (server/src/domain/enquiry.ts). */
export const ENQUIRY_LIMITS = { name: 100, email: 254, phone: 30, message: 2000 } as const;

/** F5: sends an enquiry. Resolves on 201; rejects with an ApiError otherwise. */
export function sendEnquiry(enquiry: EnquiryRequest, signal?: AbortSignal): Promise<{ status: 'received' }> {
  return postJson<{ status: 'received' }>('/enquiries', enquiry, signal);
}

/** The per-field messages of a 400 VALIDATION_FAILED, or an empty object for any other error. */
export function fieldErrorsOf(error: ApiError): EnquiryFieldErrors {
  if (error.status !== 400 || typeof error.details !== 'object' || error.details === null || !('fields' in error.details)) {
    return {};
  }
  const { fields } = error.details;
  if (typeof fields !== 'object' || fields === null) {
    return {};
  }
  const result: EnquiryFieldErrors = {};
  for (const field of ['name', 'email', 'phone', 'message'] as const) {
    const message: unknown = (fields as Record<string, unknown>)[field];
    if (typeof message === 'string') {
      result[field] = message;
    }
  }
  return result;
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^[0-9+() .-]+$/;

/**
 * The same rules as the server, checked before sending so the customer gets
 * instant feedback. The server checks again; its answer wins.
 */
export function validateEnquiry(values: Pick<EnquiryRequest, EnquiryField>): EnquiryFieldErrors {
  const errors: EnquiryFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const message = values.message.trim();

  if (name === '') {
    errors.name = 'Enter your name.';
  } else if (name.length > ENQUIRY_LIMITS.name) {
    errors.name = `Use at most ${ENQUIRY_LIMITS.name} characters.`;
  }

  if (email === '') {
    errors.email = 'Enter your email address.';
  } else if (email.length > ENQUIRY_LIMITS.email) {
    errors.email = `Use at most ${ENQUIRY_LIMITS.email} characters.`;
  } else if (!SIMPLE_EMAIL.test(email)) {
    errors.email = 'Enter a valid email address, like name@example.com.';
  }

  if (phone !== '') {
    if (phone.length > ENQUIRY_LIMITS.phone) {
      errors.phone = `Use at most ${ENQUIRY_LIMITS.phone} characters.`;
    } else if (!PHONE_CHARACTERS.test(phone) || (phone.match(/\d/g)?.length ?? 0) < 6) {
      errors.phone = 'Enter a phone number using digits, spaces and + ( ) - only.';
    }
  }

  if (message.length > ENQUIRY_LIMITS.message) {
    errors.message = `Use at most ${ENQUIRY_LIMITS.message} characters.`;
  }

  return errors;
}
