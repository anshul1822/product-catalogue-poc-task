import type { EmailMessage } from '../domain/enquiry-email.js';

/**
 * Sends an email. SMTP today (Mailpit locally); Amazon SES over SMTP is a config
 * change, an API-based provider is one new adapter.
 *
 * Contract: resolves once the provider accepted the message; any failure throws
 * `UpstreamError`.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
