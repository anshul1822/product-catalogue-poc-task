import { describe, expect, it } from 'vitest';
import { parseEnquiry } from './enquiry.js';

const VALID = { productId: '3', name: 'Ada Lovelace', email: 'ada@example.com' };

function errorsFor(body: unknown) {
  const result = parseEnquiry(body);
  if (result.ok) {
    throw new Error('expected the enquiry to be invalid');
  }
  return result.errors;
}

describe('parseEnquiry', () => {
  it('accepts the required fields and treats missing optional fields as null', () => {
    expect(parseEnquiry(VALID)).toEqual({
      ok: true,
      input: { productId: '3', name: 'Ada Lovelace', email: 'ada@example.com', phone: null, message: null },
      honeypotFilled: false,
    });
  });

  it('trims every field and keeps phone and message when given', () => {
    const result = parseEnquiry({
      productId: '3',
      name: '  Ada Lovelace ',
      email: ' ada@example.com ',
      phone: ' +61 2 9876 5432 ',
      message: '  Is it waterproof?\nThanks.  ',
    });

    expect(result).toMatchObject({
      ok: true,
      input: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+61 2 9876 5432', message: 'Is it waterproof?\nThanks.' },
    });
  });

  it.each([null, '', '   '])('treats the optional phone and message %j as not given', (blank) => {
    expect(parseEnquiry({ ...VALID, phone: blank, message: blank })).toMatchObject({
      ok: true,
      input: { phone: null, message: null },
    });
  });

  it('ignores unknown fields', () => {
    expect(parseEnquiry({ ...VALID, isAdmin: true, price: 0 })).toMatchObject({ ok: true });
  });

  it.each([
    ['name missing', { productId: '3', email: 'ada@example.com' }, 'name', 'Enter your name.'],
    ['name blank', { ...VALID, name: '   ' }, 'name', 'Enter your name.'],
    ['name too long', { ...VALID, name: 'x'.repeat(101) }, 'name', 'Use at most 100 characters.'],
    ['name with a line break', { ...VALID, name: 'Ada\r\nBcc: victim@example.com' }, 'name', 'Your name must be on one line.'],
    ['email missing', { productId: '3', name: 'Ada' }, 'email', 'Enter your email address.'],
    ['email not an address', { ...VALID, email: 'ada.example.com' }, 'email', 'Enter a valid email address, like name@example.com.'],
    ['email with a line break', { ...VALID, email: 'ada@example.com\nBcc: x@y.z' }, 'email', 'Your email address must be on one line.'],
    ['email too long', { ...VALID, email: `${'a'.repeat(250)}@x.io` }, 'email', 'Use at most 254 characters.'],
    ['phone with letters', { ...VALID, phone: 'call me' }, 'phone', 'Enter a phone number using digits, spaces and + ( ) - only.'],
    ['phone too short', { ...VALID, phone: '12345' }, 'phone', 'Enter a phone number using digits, spaces and + ( ) - only.'],
    ['phone with a line break', { ...VALID, phone: '0412\n345678' }, 'phone', 'Enter a phone number using digits, spaces and + ( ) - only.'],
    ['phone too long', { ...VALID, phone: '1'.repeat(31) }, 'phone', 'Use at most 30 characters.'],
    ['message too long', { ...VALID, message: 'x'.repeat(2001) }, 'message', 'Use at most 2000 characters.'],
    ['message with a control character', { ...VALID, message: 'hi\u0007' }, 'message', 'Remove special control characters from your message.'],
    ['productId missing', { name: 'Ada', email: 'ada@example.com' }, 'productId', 'Choose a product to enquire about.'],
    ['productId impossible', { ...VALID, productId: '../3' }, 'productId', 'Choose a product to enquire about.'],
    ['name not a string', { ...VALID, name: 42 }, 'name', 'Enter your name.'],
  ])('rejects %s', (_case, body, field, message) => {
    expect(errorsFor(body)).toEqual({ [field]: message });
  });

  it('reports every invalid field at once', () => {
    expect(Object.keys(errorsFor({ productId: '3', name: '', email: 'nope', phone: 'x' })).sort()).toEqual([
      'email',
      'name',
      'phone',
    ]);
  });

  it.each([null, 'text', 42, ['a']])('rejects a body that is not an object (%j)', (body) => {
    expect(errorsFor(body)).toEqual({ form: 'Send the enquiry as a JSON object.' });
  });

  it.each([
    ['empty', '', false],
    ['missing', undefined, false],
    ['filled', 'https://spam.example', true],
    ['filled with a number', 1, true],
  ])('honeypot %s -> honeypotFilled %s', (_case, website, filled) => {
    const body = website === undefined ? VALID : { ...VALID, website };

    expect(parseEnquiry(body)).toMatchObject({ ok: true, honeypotFilled: filled });
  });
});
