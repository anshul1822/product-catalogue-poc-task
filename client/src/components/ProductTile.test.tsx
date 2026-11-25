import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeProduct, renderWithRouter } from '../test-support/render';
import { ProductGrid } from './ProductGrid';
import { ProductTile } from './ProductTile';

describe('ProductTile', () => {
  it('is one link to the product page, named by title and price', () => {
    renderWithRouter(<ProductTile product={makeProduct()} />);

    const link = screen.getByRole('link', { name: 'Mens Cotton Jacket $55.99' });
    expect(link).toHaveAttribute('href', '/products/3');
  });

  it('shows the image as decorative, so the title is not announced twice', () => {
    const { container } = renderWithRouter(<ProductTile product={makeProduct()} />);

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://images.test/jacket.png');
    expect(image).toHaveAttribute('alt', '');
  });

  it('encodes the product id in the link', () => {
    renderWithRouter(<ProductTile product={makeProduct({ id: 'a b/c' })} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/a%20b%2Fc');
  });
});

describe('ProductGrid', () => {
  it('renders a labelled list with one tile per product, in order', () => {
    renderWithRouter(
      <ProductGrid
        label="Top rated"
        products={[makeProduct({ id: '1', title: 'First' }), makeProduct({ id: '2', title: 'Second' })]}
      />,
    );

    const list = screen.getByRole('list', { name: 'Top rated' });
    expect(list.children).toHaveLength(2);
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/products/1',
      '/products/2',
    ]);
  });
});
