import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test-support/fixtures.js';
import { buildEnquiryEmail, type EnquiryEmailInput } from './enquiry-email.js';

const BASE: EnquiryEmailInput = {
  enquiryId: '6f1f8b2e-8c1a-4a7e-9a1e-3b2c1d0e9f8a',
  enquiry: { productId: '3', name: 'Ada Lovelace', email: 'ada@example.com', phone: '+61 2 9876 5432', message: 'Is it waterproof?\nThanks.' },
  product: makeProduct({ id: '3', title: 'Mens Cotton Jacket', price: 55.99 }),
  receivedAt: new Date('2026-11-24T10:00:00.000Z'),
  to: 'sales@catalogue.local',
  from: 'no-reply@catalogue.local',
  appUrl: 'http://localhost:8080',
};

describe('buildEnquiryEmail', () => {
  it('goes to the sales inbox, from the app, with the customer as Reply-To', () => {
    const email = buildEnquiryEmail(BASE);

    expect(email).toMatchObject({
      to: 'sales@catalogue.local',
      from: 'no-reply@catalogue.local',
      replyTo: 'ada@example.com',
      subject: 'New enquiry: Mens Cotton Jacket (#3)',
    });
  });

  it('holds the product, the customer details, the message and when it arrived', () => {
    const { text } = buildEnquiryEmail(BASE);

    expect(text).toContain('Product:    Mens Cotton Jacket');
    expect(text).toContain('Price:      $55.99');
    expect(text).toContain('Link:       http://localhost:8080/products/3');
    expect(text).toContain('From:       Ada Lovelace');
    expect(text).toContain('Email:      ada@example.com');
    expect(text).toContain('Phone:      +61 2 9876 5432');
    expect(text).toContain('Message:\nIs it waterproof?\nThanks.');
    expect(text).toContain('Received:   2026-11-24T10:00:00.000Z');
    expect(text).toContain('Enquiry id: 6f1f8b2e-8c1a-4a7e-9a1e-3b2c1d0e9f8a');
  });

  it('says so when the phone and message were not given', () => {
    const { text } = buildEnquiryEmail({ ...BASE, enquiry: { ...BASE.enquiry, phone: null, message: null } });

    expect(text).toContain('Phone:      not given');
    expect(text).toContain('Message:\n(no message)');
  });

  it('keeps customer text as plain text: markup is not interpreted', () => {
    const message = '<a href="https://evil.example">click</a> <script>alert(1)</script>';
    const { text } = buildEnquiryEmail({ ...BASE, enquiry: { ...BASE.enquiry, message } });

    expect(text).toContain(message);
  });

  it('keeps the subject on one line even if the product title has line breaks', () => {
    const product = makeProduct({ id: '3', title: 'Jacket\r\nBcc: someone@example.com' });

    const { subject } = buildEnquiryEmail({ ...BASE, product });

    expect(subject).toBe('New enquiry: Jacket Bcc: someone@example.com (#3)');
    expect(subject).not.toMatch(/[\r\n]/);
  });

  it('shortens a very long product title in the subject', () => {
    const product = makeProduct({ id: '3', title: 'x'.repeat(300) });

    const { subject } = buildEnquiryEmail({ ...BASE, product });

    expect(subject.length).toBeLessThan(150);
    expect(subject.endsWith('… (#3)')).toBe(true);
  });

  it('encodes the product id in the link', () => {
    const product = makeProduct({ id: 'a b', title: 'Mug' });

    expect(buildEnquiryEmail({ ...BASE, product }).text).toContain('http://localhost:8080/products/a%20b');
  });
});
