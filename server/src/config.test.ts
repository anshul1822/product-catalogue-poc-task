import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { describe, expect, it } from 'vitest';
import { CONFIG_DEFAULTS, loadConfig } from './config.js';
import { ConfigError } from './domain/errors.js';
import { REPO_ROOT } from './test-support/fixtures.js';

function configError(env: NodeJS.ProcessEnv): ConfigError {
  try {
    loadConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return error as ConfigError;
  }
  throw new Error('expected loadConfig to throw');
}

const DOCKER_ENV = {
  ENQUIRY_STORE: 'postgres',
  DATABASE_URL: 'postgresql://catalogue:catalogue@postgres:5432/catalogue',
  EMAIL_PROVIDER: 'smtp',
  SMTP_HOST: 'mailpit',
  SMTP_PORT: '1025',
};

describe('loadConfig', () => {
  it('uses safe local defaults when nothing is set: memory store, console email', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      fakeStore: { baseUrl: 'https://fakestoreapi.com', timeoutMs: 5000 },
      featuredProductIds: ['12', '11', '3', '18', '5'],
      enquiryStore: { kind: 'memory' },
      email: { provider: 'console' },
      enquiryEmail: { from: 'no-reply@catalogue.local', to: 'sales@catalogue.local' },
      publicAppUrl: 'http://localhost:8080',
    });
  });

  it('reads values from the environment', () => {
    const config = loadConfig({
      PORT: '8081',
      FAKESTORE_BASE_URL: 'http://fakestore.internal:9000',
      UPSTREAM_TIMEOUT_MS: '2500',
      FEATURED_PRODUCT_IDS: '1, 2, 3, 4, 5',
      SALES_INBOX_EMAIL: 'enquiries@shop.example',
      EMAIL_FROM: 'catalogue@shop.example',
      PUBLIC_APP_URL: 'https://shop.example',
    });

    expect(config).toMatchObject({
      port: 8081,
      fakeStore: { baseUrl: 'http://fakestore.internal:9000', timeoutMs: 2500 },
      featuredProductIds: ['1', '2', '3', '4', '5'],
      enquiryEmail: { from: 'catalogue@shop.example', to: 'enquiries@shop.example' },
      publicAppUrl: 'https://shop.example',
    });
  });

  it('reads the Docker setup: PostgreSQL and SMTP to Mailpit, no login', () => {
    expect(loadConfig(DOCKER_ENV)).toMatchObject({
      enquiryStore: { kind: 'postgres', databaseUrl: 'postgresql://catalogue:catalogue@postgres:5432/catalogue' },
      email: { provider: 'smtp', host: 'mailpit', port: 1025, secure: false, user: null, pass: null },
    });
  });

  it('passes SMTP credentials through for a real provider', () => {
    const config = loadConfig({ ...DOCKER_ENV, SMTP_HOST: 'email-smtp.ap-southeast-2.amazonaws.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'AKIA', SMTP_PASS: 'secret' });

    expect(config.email).toEqual({ provider: 'smtp', host: 'email-smtp.ap-southeast-2.amazonaws.com', port: 465, secure: true, user: 'AKIA', pass: 'secret' });
  });

  it('allows PostgreSQL and SMTP in production', () => {
    expect(() => loadConfig({ ...DOCKER_ENV, NODE_ENV: 'production' })).not.toThrow();
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '0'],
    ['PORT', '70000'],
    ['PORT', ''],
    ['FAKESTORE_BASE_URL', 'not a url'],
    ['FAKESTORE_BASE_URL', 'ftp://fakestore.test'],
    ['UPSTREAM_TIMEOUT_MS', '10'],
    ['UPSTREAM_TIMEOUT_MS', 'soon'],
    ['ENQUIRY_STORE', 'mysql'],
    ['EMAIL_PROVIDER', 'carrier-pigeon'],
    ['SMTP_PORT', 'twenty-five'],
    ['SMTP_SECURE', 'yes'],
    ['SALES_INBOX_EMAIL', 'not-an-email'],
    ['EMAIL_FROM', ''],
    ['PUBLIC_APP_URL', 'localhost:8080'],
  ])('rejects %s=%j', (key, value) => {
    expect(configError({ [key]: value }).message).toContain(`${key}:`);
  });

  it.each(['', 'mysql://x@y/z', 'not a url'])('rejects DATABASE_URL=%j when the store is postgres', (url) => {
    expect(configError({ ENQUIRY_STORE: 'postgres', DATABASE_URL: url }).message).toContain('DATABASE_URL:');
  });

  it('refuses the memory store and console email in production', () => {
    const message = configError({ NODE_ENV: 'production' }).message;

    expect(message).toContain('ENQUIRY_STORE: "memory"');
    expect(message).toContain('EMAIL_PROVIDER: "console"');
  });

  it('rejects featured ids that are not exactly 5 unique ids', () => {
    expect(configError({ FEATURED_PRODUCT_IDS: '1,2,2,3,4' }).message).toContain('duplicates');
    expect(configError({ FEATURED_PRODUCT_IDS: '1,2' }).message).toContain('exactly 5');
  });

  it('lists every problem in one error', () => {
    const message = configError({ PORT: 'abc', UPSTREAM_TIMEOUT_MS: '1', FEATURED_PRODUCT_IDS: '1' }).message;

    expect(message).toContain('PORT:');
    expect(message).toContain('UPSTREAM_TIMEOUT_MS:');
    expect(message).toContain('FEATURED_PRODUCT_IDS');
  });
});

describe('.env.example', () => {
  it('holds the same values as the code defaults, so the two cannot drift apart', () => {
    const example = parseEnv(readFileSync(join(REPO_ROOT, '.env.example'), 'utf8'));

    for (const [key, value] of Object.entries(CONFIG_DEFAULTS)) {
      expect(example[key], key).toBe(value);
    }
  });
});
