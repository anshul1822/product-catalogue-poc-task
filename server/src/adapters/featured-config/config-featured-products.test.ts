import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError } from '../../domain/errors.js';
import { REPO_ROOT, snapshotProducts } from '../../test-support/fixtures.js';
import { InMemoryProductSource } from '../in-memory/in-memory-product-source.js';
import { ConfigFeaturedProducts, parseFeaturedIds } from './config-featured-products.js';

describe('parseFeaturedIds', () => {
  it('returns the ids in configured order', () => {
    expect(parseFeaturedIds('12,11,3,18,5')).toEqual(['12', '11', '3', '18', '5']);
  });

  it('trims whitespace around ids', () => {
    expect(parseFeaturedIds(' 12 , 11,3 ,18, 5 ')).toEqual(['12', '11', '3', '18', '5']);
  });

  it.each([
    ['too few', '1,2,3,4', 'exactly 5'],
    ['too many', '1,2,3,4,5,6', 'exactly 5'],
    ['duplicates', '1,2,2,3,4', 'duplicates: 2'],
    ['a blank entry', '1,,3,4,5', 'invalid'],
    ['an empty value', '', 'invalid'],
    ['unsafe characters', '1,2,3,4,5<script>', 'invalid'],
  ])('rejects %s', (_case, raw, message) => {
    expect(() => parseFeaturedIds(raw)).toThrow(ConfigError);
    expect(() => parseFeaturedIds(raw)).toThrow(message);
  });
});

describe('ConfigFeaturedProducts', () => {
  it('returns the configured ids, unaffected by later changes to the input', async () => {
    const ids = ['12', '11', '3', '18', '5'];
    const featured = new ConfigFeaturedProducts(ids);
    ids.reverse();

    await expect(featured.getFeaturedIds()).resolves.toEqual(['12', '11', '3', '18', '5']);
  });
});

describe('default FEATURED_PRODUCT_IDS in .env.example', () => {
  it('is valid and every id exists in the recorded Fake Store data', async () => {
    const envExample = readFileSync(join(REPO_ROOT, '.env.example'), 'utf8');
    const raw = /^FEATURED_PRODUCT_IDS=(.*)$/m.exec(envExample)?.[1];
    expect(raw).toBeDefined();

    const ids = parseFeaturedIds(raw ?? '');
    const products = await new InMemoryProductSource(snapshotProducts()).getByIds(ids);

    expect(products.map((p) => p.id)).toEqual(ids);
  });
});
