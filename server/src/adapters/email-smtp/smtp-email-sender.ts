import nodemailer from 'nodemailer';
import type { EmailMessage } from '../../domain/enquiry-email.js';
import { UpstreamError } from '../../domain/errors.js';
import type { EmailSender } from '../../ports/email-sender.js';

const SOURCE = 'smtp';

export interface SmtpOptions {
  readonly host: string;
  readonly port: number;
  /** TLS from the start (port 465). Mailpit and STARTTLS providers use `false`. */
  readonly secure: boolean;
  /** Only for a real provider; Mailpit needs no login. */
  readonly user: string | null;
  readonly pass: string | null;
}

/** The part of a Nodemailer transport this adapter uses; tests inject a fake. */
export interface MailTransport {
  sendMail(mail: { from: string; to: string; replyTo: string; subject: string; text: string }): Promise<unknown>;
}

/**
 * `EmailSender` over SMTP with Nodemailer: Mailpit locally, Amazon SES or any
 * SMTP provider later by configuration. Short timeouts, so a dead mail server
 * fails the request in seconds instead of hanging it.
 */
export class SmtpEmailSender implements EmailSender {
  private readonly transport: MailTransport;

  constructor(options: SmtpOptions, transport?: MailTransport) {
    this.transport =
      transport ??
      nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure,
        ...(options.user === null ? {} : { auth: { user: options.user, pass: options.pass ?? '' } }),
        connectionTimeout: 5_000,
        greetingTimeout: 5_000,
        socketTimeout: 10_000,
      });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transport.sendMail({
        from: message.from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
      });
    } catch (error) {
      throw new UpstreamError(SOURCE, `sending failed: ${describe(error)}`, { cause: error });
    }
  }
}

/** A short, PII-free description of a mail error, for logs and the stored failure reason. */
function describe(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    const responseCode = 'responseCode' in error && typeof error.responseCode === 'number' ? ` ${error.responseCode}` : '';
    return code === undefined ? `error${responseCode}` : `${code}${responseCode}`;
  }
  return 'unknown error';
}
