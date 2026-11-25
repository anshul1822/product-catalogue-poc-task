import { describe, expect, it } from 'vitest';
import { ConfigFeaturedProducts } from '../adapters/featured-config/config-featured-products.js';
import { InMemoryProductSource } from '../adapters/in-memory/in-memory-product-source.js';
import { UpstreamError } from '../domain/errors.js';
import type { Category, Product } from '../domain/product.js';
import type { ProductSource } from '../ports/product-source.js';
import { recordingLogger, snapshotProducts } from '../test-support/fixtures.js';
import { CatalogueService } from './catalogue-service.js';

function serviceWith(featuredIds: string[], products: ProductSource = new InMemoryProductSource(snapshotProducts())) {
  const logger = recordingLogger();
  const service = new CatalogueService({ products, featured: new ConfigFeaturedProducts(featuredIds), logger });
  return { service, logger };
}

const ids = (products: readonly Product[]): string[] => products.map((product) => product.id);

describe('CatalogueService.getFeatured', () => {
  it('returns exactly the configured products, in the configured order', async () => {
    const { service, logger } = serviceWith(['12', '11', '3', '18', '5']);

    const featured = await service.getFeatured();

    expect(ids(featured)).toEqual(['12', '11', '3', '18', '5']);
    expect(featured[0]).toMatchObject({
      id: '12',
      title: 'WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive',
      category: { slug: 'electronics', name: 'Electronics' },
    });
    expect(logger.lines('warn')).toEqual([]);
  });

  it('follows a different configured order', async () => {
    const { service } = serviceWith(['5', '18', '3', '11', '12']);

    expect(ids(await service.getFeatured())).toEqual(['5', '18', '3', '11', '12']);
  });

  it('skips an id the product source no longer has, and logs it as a warning', async () => {
    const { service, logger } = serviceWith(['12', '999', '3', '18', '5']);

    const featured = await service.getFeatured();

    expect(ids(featured)).toEqual(['12', '3', '18', '5']);
    expect(logger.lines('warn')).toEqual(['Featured product ids not found in the product source: 999']);
  });

  it('returns an empty list when no configured id exists', async () => {
    const { service, logger } = serviceWith(['91', '92', '93', '94', '95']);

    expect(await service.getFeatured()).toEqual([]);
    expect(logger.lines('warn')[0]).toContain('91, 92, 93, 94, 95');
  });

  it('lets a product source failure propagate, so the API can answer 502', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5'], new FailingProductSource());

    await expect(service.getFeatured()).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('CatalogueService.getProduct', () => {
  it('returns the product with that id', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5']);

    await expect(service.getProduct('3')).resolves.toMatchObject({ id: '3', title: 'Mens Cotton Jacket' });
  });

  it('returns null for an id the source does not have', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5']);

    await expect(service.getProduct('999')).resolves.toBeNull();
  });

  it.each(['', '../users', 'a b', 'x'.repeat(65), '3;drop'])(
    'returns null for the impossible id %j without asking the product source',
    async (id) => {
      const { service } = serviceWith(['12', '11', '3', '18', '5'], new FailingProductSource());

      await expect(service.getProduct(id)).resolves.toBeNull();
    },
  );

  it('lets a product source failure propagate', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5'], new FailingProductSource());

    await expect(service.getProduct('3')).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('CatalogueService.getCategories', () => {
  it('returns the four categories with slugs and display names', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5']);

    await expect(service.getCategories()).resolves.toEqual([
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'jewellery', name: 'Jewellery' },
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'womens-clothing', name: "Women's Clothing" },
    ]);
  });
});

describe('CatalogueService.getCategoryPage', () => {
  it('returns the category, its featured products as top rated, and the rest', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5']);

    const page = await service.getCategoryPage('electronics');

    expect(page?.category).toEqual({ slug: 'electronics', name: 'Electronics' });
    expect(ids(page?.topRated ?? [])).toEqual(['12', '11']);
    expect(ids(page?.others ?? [])).toEqual(['9', '10', '13', '14']);
  });

  it('uses the configured featured ids, so changing them changes the page', async () => {
    const { service } = serviceWith(['1', '2', '3', '4', '5']);

    expect(ids((await service.getCategoryPage('electronics'))?.topRated ?? [])).toEqual(['12', '11', '9']);
  });

  it('returns null for a category that does not exist', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5']);

    await expect(service.getCategoryPage('toys')).resolves.toBeNull();
  });

  it.each(['', 'Electronics', "men's clothing", '../etc', 'jewelery-'])(
    'returns null for the impossible slug %j without asking the product source',
    async (slug) => {
      const { service } = serviceWith(['12', '11', '3', '18', '5'], new FailingProductSource());

      await expect(service.getCategoryPage(slug)).resolves.toBeNull();
    },
  );

  it('lets a product source failure propagate', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5'], new FailingProductSource());

    await expect(service.getCategoryPage('electronics')).rejects.toBeInstanceOf(UpstreamError);
    await expect(service.getCategories()).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('CatalogueService.search', () => {
  it('returns only the products whose text matches, in source order', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5']);

    expect(ids(await service.search('jacket'))).toEqual(['3', '15', '16', '17']);
  });

  it('trims the term and ignores case', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5']);

    expect(ids(await service.search('  JACKET  '))).toEqual(['3', '15', '16', '17']);
  });

  it.each(['', '   '])('returns nothing for the blank term %j without asking the product source', async (term) => {
    const { service } = serviceWith(['12', '11', '3', '18', '5'], new FailingProductSource());

    await expect(service.search(term)).resolves.toEqual([]);
  });

  it('lets a product source failure propagate', async () => {
    const { service } = serviceWith(['12', '11', '3', '18', '5'], new FailingProductSource());

    await expect(service.search('jacket')).rejects.toBeInstanceOf(UpstreamError);
  });
});

/** A product source whose upstream is down. */
class FailingProductSource extends InMemoryProductSource {
  constructor() {
    super([]);
  }

  override getByIds(): Promise<Product[]> {
    return Promise.reject(new UpstreamError('fakestore', 'GET /products returned HTTP 500'));
  }

  override getById(): Promise<Product | null> {
    return Promise.reject(new UpstreamError('fakestore', 'GET /products/{id} returned HTTP 500'));
  }

  override getByCategory(): Promise<Product[] | null> {
    return Promise.reject(new UpstreamError('fakestore', 'GET /products returned HTTP 500'));
  }

  override getCategories(): Promise<Category[]> {
    return Promise.reject(new UpstreamError('fakestore', 'GET /products returned HTTP 500'));
  }

  override search(): Promise<Product[]> {
    return Promise.reject(new UpstreamError('fakestore', 'GET /products returned HTTP 500'));
  }
}
