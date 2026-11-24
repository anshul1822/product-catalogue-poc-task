import { describe, expect, it } from 'vitest';
import { ConfigFeaturedProducts } from '../adapters/featured-config/config-featured-products.js';
import { InMemoryProductSource } from '../adapters/in-memory/in-memory-product-source.js';
import { UpstreamError } from '../domain/errors.js';
import type { Product } from '../domain/product.js';
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

/** A product source whose upstream is down. */
class FailingProductSource extends InMemoryProductSource {
  constructor() {
    super([]);
  }

  override getByIds(): Promise<Product[]> {
    return Promise.reject(new UpstreamError('fakestore', 'GET /products returned HTTP 500'));
  }
}
