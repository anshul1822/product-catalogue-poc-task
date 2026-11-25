import type { EmailMessage } from '../../domain/enquiry-email.js';
import type { Logger } from '../../logger.js';
import type { EmailSender } from '../../ports/email-sender.js';

/**
 * `EmailSender` that prints the email instead of sending it (`EMAIL_PROVIDER=console`),
 * for running the API without Docker. It prints customer details, so config refuses
 * it in production (no personal data in production logs).
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly logger: Logger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info(
      [
        '--- Email (EMAIL_PROVIDER=console, not sent) ---',
        `To: ${message.to}`,
        `From: ${message.from}`,
        `Reply-To: ${message.replyTo}`,
        `Subject: ${message.subject}`,
        '',
        message.text,
        '--- end of email ---',
      ].join('\n'),
    );
  }
}
