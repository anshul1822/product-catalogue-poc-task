import { describe, expect, it } from 'vitest';
import { recordingLogger } from '../../test-support/fixtures.js';
import { ConsoleEmailSender } from './console-email-sender.js';

describe('ConsoleEmailSender', () => {
  it('prints the whole email instead of sending it', async () => {
    const logger = recordingLogger();

    await new ConsoleEmailSender(logger).send({
      from: 'no-reply@catalogue.local',
      to: 'sales@catalogue.local',
      replyTo: 'ada@example.com',
      subject: 'New enquiry: Mens Cotton Jacket (#3)',
      text: 'Body text',
    });

    const [line] = logger.lines('info');
    expect(line).toContain('To: sales@catalogue.local');
    expect(line).toContain('Reply-To: ada@example.com');
    expect(line).toContain('Subject: New enquiry: Mens Cotton Jacket (#3)');
    expect(line).toContain('Body text');
  });
});
