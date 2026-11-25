import type { EnquiryInput } from './enquiry.js';
import type { Product } from './product.js';

/** A plain-text email, provider-neutral. `EmailSender` adapters turn it into SMTP or an API call. */
export interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly replyTo: string;
  readonly subject: string;
  readonly text: string;
}

export interface EnquiryEmailInput {
  readonly enquiryId: string;
  readonly enquiry: EnquiryInput;
  readonly product: Product;
  readonly receivedAt: Date;
  /** Where the enquiry goes: the sales inbox. */
  readonly to: string;
  readonly from: string;
  /** Base URL of the web app, for the product link. */
  readonly appUrl: string;
}

const MAX_SUBJECT_TITLE_LENGTH = 120;

const priceFormatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

/**
 * The email the sales inbox receives for one enquiry (F5).
 *
 * - Plain text only, so nothing the customer typed can become HTML or a link
 *   that runs; no escaping rules to get wrong.
 * - Reply-To is the customer, so sales can answer with one click.
 * - The subject uses the product title from the product source, never customer
 *   input; control characters in it are replaced, so it stays one header line.
 */
export function buildEnquiryEmail(input: EnquiryEmailInput): EmailMessage {
  const { enquiryId, enquiry, product, receivedAt } = input;
  const productUrl = new URL(`/products/${encodeURIComponent(product.id)}`, input.appUrl).href;

  const text = [
    'New enquiry about a product.',
    '',
    `Product:    ${product.title}`,
    `Price:      ${priceFormatter.format(product.price)}`,
    `Product id: ${product.id}`,
    `Link:       ${productUrl}`,
    '',
    `From:       ${enquiry.name}`,
    `Email:      ${enquiry.email}`,
    `Phone:      ${enquiry.phone ?? 'not given'}`,
    '',
    'Message:',
    enquiry.message ?? '(no message)',
    '',
    `Received:   ${receivedAt.toISOString()}`,
    `Enquiry id: ${enquiryId}`,
    '',
    'Reply to this email to answer the customer.',
  ].join('\n');

  return {
    from: input.from,
    to: input.to,
    replyTo: enquiry.email,
    subject: `New enquiry: ${toHeaderText(product.title, MAX_SUBJECT_TITLE_LENGTH)} (#${product.id})`,
    text,
  };
}

/** One line, at most `max` characters: control characters become spaces, runs of spaces collapse. */
function toHeaderText(value: string, max: number): string {
  const oneLine = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1).trimEnd()}…`;
}
