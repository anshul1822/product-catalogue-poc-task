import { describe, expect, it } from 'vitest';
import { matchesSearch } from '../domain/search.js';
import type { ProductSource } from '../ports/product-source.js';

/**
 * Behaviour every `ProductSource` must have, run against each adapter over the
 * same snapshot data (20 Fake Store products). A new adapter (e.g. a database)
 * passes this suite before it is wired in.
 */
export function describeProductSourceContract(name: string, createSource: () => ProductSource): void {
  describe(`ProductSource contract: ${name}`, () => {
    const ids = (products: ReadonlyArray<{ id: string }>): string[] => products.map((p) => p.id);

    it('lists every product with string ids', async () => {
      const products = await createSource().getAll();

      expect(products).toHaveLength(20);
      expect(ids(products)).toEqual(Array.from({ length: 20 }, (_, i) => String(i + 1)));
    });

    it('finds a product by id', async () => {
      const product = await createSource().getById('1');

      expect(product).toMatchObject({
        id: '1',
        title: 'Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops',
        price: 109.95,
        category: { slug: 'mens-clothing', name: "Men's Clothing" },
      });
      expect(product?.imageUrl).toMatch(/^https:\/\//);
    });

    it.each(['999', 'abc', ''])('returns null for the unknown id %j', async (id) => {
      await expect(createSource().getById(id)).resolves.toBeNull();
    });

    it('returns products by ids in the requested order, skipping unknown ones', async () => {
      const products = await createSource().getByIds(['12', '11', '999', '3', '18', '5']);

      expect(ids(products)).toEqual(['12', '11', '3', '18', '5']);
    });

    it('lists the four categories with slugs and display names', async () => {
      await expect(createSource().getCategories()).resolves.toEqual([
        { slug: 'mens-clothing', name: "Men's Clothing" },
        { slug: 'jewellery', name: 'Jewellery' },
        { slug: 'electronics', name: 'Electronics' },
        { slug: 'womens-clothing', name: "Women's Clothing" },
      ]);
    });

    it('returns only the products of a category', async () => {
      const source = createSource();

      expect(ids((await source.getByCategory('jewellery')) ?? [])).toEqual(['5', '6', '7', '8']);
      expect(ids((await source.getByCategory('electronics')) ?? [])).toEqual(['9', '10', '11', '12', '13', '14']);
    });

    it.each(['toys', 'jewelery', "men's clothing", ''])('returns null for the unknown category %j', async (slug) => {
      await expect(createSource().getByCategory(slug)).resolves.toBeNull();
    });

    it('search returns exactly the products whose text matches', async () => {
      const source = createSource();

      expect(ids(await source.search('jacket'))).toEqual(['3', '15', '16', '17']);
      expect(ids(await source.search('  JACKET '))).toEqual(['3', '15', '16', '17']);
      // 17 matches via its description ("Attached Cotton Lined Hood").
      expect(ids(await source.search('cotton jacket'))).toEqual(['3', '16', '17']);
      expect(ids(await source.search('jacket cotton'))).toEqual(['3', '16', '17']);
    });

    it('search never returns a non-matching product', async () => {
      const source = createSource();
      const all = await source.getAll();

      for (const term of ['gold', 'ssd', 'women', 'usb 3.0']) {
        const results = await source.search(term);
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((product) => matchesSearch(product, term))).toBe(true);
        expect(results.length).toBe(all.filter((product) => matchesSearch(product, term)).length);
      }
    });

    it.each(['', '   ', 'zzzz-no-such-product'])('search returns nothing for %j', async (term) => {
      await expect(createSource().search(term)).resolves.toEqual([]);
    });
  });
}
