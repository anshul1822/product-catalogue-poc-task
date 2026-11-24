import { z } from 'zod';
import { isValidProductId } from './product.js';

/** Longest value accepted for each field; the database columns have the same sizes. */
export const ENQUIRY_LIMITS = { name: 100, email: 254, phone: 30, message: 2000 } as const;

export type EnquiryStatus = 'PENDING' | 'SENT' | 'FAILED';

/** A valid enquiry from the customer, ready to store and send. */
export interface EnquiryInput {
  readonly productId: string;
  readonly name: string;
  readonly email: string;
  /** `null` when not given. */
  readonly phone: string | null;
  /** `null` when not given. */
  readonly message: string | null;
}

export type EnquiryField = 'productId' | 'name' | 'email' | 'phone' | 'message';

/** One message per invalid field, for the form to show next to it. */
export type EnquiryFieldErrors = Partial<Record<EnquiryField | 'form', string>>;

export type ParsedEnquiry =
  | { readonly ok: true; readonly input: EnquiryInput; readonly honeypotFilled: boolean }
  | { readonly ok: false; readonly errors: EnquiryFieldErrors };

/**
 * Control characters, including CR and LF. Single-line fields reject all of them,
 * so a name or email address can never add a line to an email header.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
/** The message may span lines (CR, LF, tab); other control characters are still rejected. */
const CONTROL_CHARACTERS_EXCEPT_NEWLINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const PHONE_CHARACTERS = /^[0-9+() .-]+$/;
const MIN_PHONE_DIGITS = 6;

/** Treats a missing, null or blank optional field as "not given". */
const blankToUndefined = (value: unknown): unknown =>
  value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value;

const enquirySchema = z.object({
  productId: z
    .string({ error: 'Choose a product to enquire about.' })
    .refine(isValidProductId, 'Choose a product to enquire about.'),
  name: z
    .string({ error: 'Enter your name.' })
    .trim()
    .min(1, 'Enter your name.')
    .max(ENQUIRY_LIMITS.name, `Use at most ${ENQUIRY_LIMITS.name} characters.`)
    .refine((value) => !CONTROL_CHARACTERS.test(value), 'Your name must be on one line.'),
  email: z
    .string({ error: 'Enter your email address.' })
    .trim()
    .min(1, 'Enter your email address.')
    .max(ENQUIRY_LIMITS.email, `Use at most ${ENQUIRY_LIMITS.email} characters.`)
    .refine((value) => !CONTROL_CHARACTERS.test(value), 'Your email address must be on one line.')
    .pipe(z.email({ error: 'Enter a valid email address, like name@example.com.' })),
  phone: z.preprocess(
    blankToUndefined,
    z
      .string({ error: 'Enter a phone number, or leave it empty.' })
      .trim()
      .max(ENQUIRY_LIMITS.phone, `Use at most ${ENQUIRY_LIMITS.phone} characters.`)
      .refine(
        (value) => PHONE_CHARACTERS.test(value) && (value.match(/\d/g)?.length ?? 0) >= MIN_PHONE_DIGITS,
        'Enter a phone number using digits, spaces and + ( ) - only.',
      )
      .optional(),
  ),
  message: z.preprocess(
    blankToUndefined,
    z
      .string({ error: 'Enter a message, or leave it empty.' })
      .trim()
      .max(ENQUIRY_LIMITS.message, `Use at most ${ENQUIRY_LIMITS.message} characters.`)
      .refine((value) => !CONTROL_CHARACTERS_EXCEPT_NEWLINES.test(value), 'Remove special control characters from your message.')
      .optional(),
  ),
  /** Honeypot: hidden from people, so only bots fill it. Any value is accepted here and checked below. */
  website: z.unknown().optional(),
});

/**
 * Checks an enquiry body from the client. Unknown fields are ignored. On failure
 * returns one message per field; on success the trimmed input, with blank
 * optional fields as `null`, and whether the honeypot was filled.
 */
export function parseEnquiry(body: unknown): ParsedEnquiry {
  const result = enquirySchema.safeParse(body);
  if (!result.success) {
    const errors: EnquiryFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      const key: EnquiryField | 'form' = isEnquiryField(field) ? field : 'form';
      if (errors[key] === undefined) {
        errors[key] = key === 'form' ? 'Send the enquiry as a JSON object.' : issue.message;
      }
    }
    return { ok: false, errors };
  }

  const { productId, name, email, phone, message, website } = result.data;
  return {
    ok: true,
    input: { productId, name, email, phone: phone ?? null, message: message ?? null },
    honeypotFilled: website !== undefined && website !== null && website !== '',
  };
}

function isEnquiryField(value: unknown): value is EnquiryField {
  return value === 'productId' || value === 'name' || value === 'email' || value === 'phone' || value === 'message';
}
