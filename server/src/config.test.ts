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

describe('loadConfig', () => {
  it('uses safe local defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      fakeStore: { baseUrl: 'https://fakestoreapi.com', timeoutMs: 5000 },
      featuredProductIds: ['12', '11', '3', '18', '5'],
    });
  });

  it('reads values from the environment', () => {
    const config = loadConfig({
      PORT: '8081',
      FAKESTORE_BASE_URL: 'http://fakestore.internal:9000',
      UPSTREAM_TIMEOUT_MS: '2500',
      FEATURED_PRODUCT_IDS: '1, 2, 3, 4, 5',
    });

    expect(config).toEqual({
      port: 8081,
      fakeStore: { baseUrl: 'http://fakestore.internal:9000', timeoutMs: 2500 },
      featuredProductIds: ['1', '2', '3', '4', '5'],
    });
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
  ])('rejects %s=%j', (key, value) => {
    expect(configError({ [key]: value }).message).toContain(`${key}:`);
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
