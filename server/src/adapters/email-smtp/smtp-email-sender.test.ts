import { describe, expect, it } from 'vitest';
import type { EmailMessage } from '../../domain/enquiry-email.js';
import { UpstreamError } from '../../domain/errors.js';
import { type MailTransport, SmtpEmailSender } from './smtp-email-sender.js';

const OPTIONS = { host: 'mailpit', port: 1025, secure: false, user: null, pass: null };

const MESSAGE: EmailMessage = {
  from: 'no-reply@catalogue.local',
  to: 'sales@catalogue.local',
  replyTo: 'ada@example.com',
  subject: 'New enquiry: Mens Cotton Jacket (#3)',
  text: 'Hello',
};

describe('SmtpEmailSender', () => {
  it('hands the message to the transport, field for field', async () => {
    const sent: unknown[] = [];
    const transport: MailTransport = { sendMail: async (mail) => void sent.push(mail) };

    await new SmtpEmailSender(OPTIONS, transport).send(MESSAGE);

    expect(sent).toEqual([MESSAGE]);
  });

  it('turns a transport failure into UpstreamError with a short reason', async () => {
    const transport: MailTransport = {
      sendMail: () => Promise.reject(Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:1025'), { code: 'ECONNECTION' })),
    };

    const error = await new SmtpEmailSender(OPTIONS, transport).send(MESSAGE).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UpstreamError);
    expect((error as UpstreamError).message).toBe('[smtp] sending failed: ECONNECTION');
  });

  it('includes the SMTP response code when the server rejects the message', async () => {
    const transport: MailTransport = {
      sendMail: () => Promise.reject(Object.assign(new Error('Mailbox unavailable'), { code: 'EENVELOPE', responseCode: 550 })),
    };

    const error = await new SmtpEmailSender(OPTIONS, transport).send(MESSAGE).catch((e: unknown) => e);

    expect((error as UpstreamError).message).toBe('[smtp] sending failed: EENVELOPE 550');
  });

  it('fails within the timeout when nothing listens, through real Nodemailer', async () => {
    const sender = new SmtpEmailSender({ ...OPTIONS, host: '127.0.0.1', port: 9 });

    await expect(sender.send(MESSAGE)).rejects.toBeInstanceOf(UpstreamError);
  }, 15_000);
});
