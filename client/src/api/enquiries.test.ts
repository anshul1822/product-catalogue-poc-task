import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { fieldErrorsOf, validateEnquiry } from './enquiries';

const VALID = { name: 'Ada', email: 'ada@example.com', phone: '', message: '' };

describe('validateEnquiry (same rules as the server)', () => {
  it('accepts a name and an email; phone and message are optional', () => {
    expect(validateEnquiry(VALID)).toEqual({});
  });

  it.each([
    [{ ...VALID, name: '  ' }, { name: 'Enter your name.' }],
    [{ ...VALID, name: 'x'.repeat(101) }, { name: 'Use at most 100 characters.' }],
    [{ ...VALID, email: '' }, { email: 'Enter your email address.' }],
    [{ ...VALID, email: 'ada@example' }, { email: 'Enter a valid email address, like name@example.com.' }],
    [{ ...VALID, phone: '12345' }, { phone: 'Enter a phone number using digits, spaces and + ( ) - only.' }],
    [{ ...VALID, phone: '+61 (2) 9876-5432' }, {}],
    [{ ...VALID, message: 'x'.repeat(2001) }, { message: 'Use at most 2000 characters.' }],
  ])('%j -> %j', (values, errors) => {
    expect(validateEnquiry(values)).toEqual(errors);
  });
});

describe('fieldErrorsOf', () => {
  it('reads the per-field messages of a 400', () => {
    const error = new ApiError(400, 'VALIDATION_FAILED', 'Check the highlighted fields.', {
      fields: { name: 'Enter your name.', form: 'ignored', other: 1 },
    });

    expect(fieldErrorsOf(error)).toEqual({ name: 'Enter your name.' });
  });

  it.each([
    new ApiError(502, 'UPSTREAM_UNAVAILABLE', 'Down'),
    new ApiError(400, 'INVALID_JSON', 'Bad JSON'),
    new ApiError(400, 'VALIDATION_FAILED', 'x', { fields: null }),
  ])('returns no field errors for %o', (error) => {
    expect(fieldErrorsOf(error)).toEqual({});
  });
});
