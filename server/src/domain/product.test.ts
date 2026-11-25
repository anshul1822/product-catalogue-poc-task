import { describe, expect, it } from 'vitest';
import { isValidProductId } from './product.js';

describe('isValidProductId', () => {
  it.each(['1', '20', 'SKU-123', 'abc_DEF', 'x'.repeat(64)])('accepts %j', (id) => {
    expect(isValidProductId(id)).toBe(true);
  });

  it.each(['', ' ', '1 2', '../etc', '1/2', '%2e', '3;drop', 'é', 'x'.repeat(65)])('rejects %j', (id) => {
    expect(isValidProductId(id)).toBe(false);
  });
});
