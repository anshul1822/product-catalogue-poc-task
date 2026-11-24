import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Product } from '../api/types';
import { makeProduct, renderRoute } from '../test-support/render';
import { apiUrl, server } from '../test-support/server';

const FEATURED: Product[] = [
  makeProduct({ id: '12', title: 'WD 4TB Gaming Drive', price: 114 }),
  makeProduct({ id: '11', title: 'Silicon Power 256GB SSD', price: 109 }),
  makeProduct({ id: '3', title: 'Mens Cotton Jacket', price: 55.99 }),
  makeProduct({ id: '18', title: "Women's Short Sleeve Boat Neck", price: 9.85 }),
  makeProduct({ id: '5', title: 'John Hardy Chain Bracelet', price: 695 }),
];

function featuredResponds(products: Product[]) {
  server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.json(products)));
}

describe('HomePage (F1)', () => {
  it('shows the 5 featured products as tiles, in the order the API returns them', async () => {
    featuredResponds(FEATURED);
    renderRoute('/');

    const list = await screen.findByRole('list', { name: 'Top rated products' });
    const links = within(list).getAllByRole('link');

    expect(links).toHaveLength(5);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/products/12',
      '/products/11',
      '/products/3',
      '/products/18',
      '/products/5',
    ]);
    expect(links[0]).toHaveAccessibleName('WD 4TB Gaming Drive $114.00');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a loading message until the products arrive', async () => {
    featuredResponds(FEATURED);
    renderRoute('/');

    expect(screen.getByRole('status')).toHaveTextContent('Loading top rated products…');
    expect(await screen.findByRole('list', { name: 'Top rated products' })).toBeInTheDocument();
  });

  it('shows the API error with a retry, and loads the products when retried', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/featured-products'), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              {
                error: {
                  code: 'UPSTREAM_UNAVAILABLE',
                  message: 'A service this request depends on is unavailable. Please try again.',
                },
              },
              { status: 502 },
            )
          : HttpResponse.json(FEATURED);
      }),
    );
    renderRoute('/');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A service this request depends on is unavailable. Please try again.');

    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('list', { name: 'Top rated products' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('shows a message when the server cannot be reached', async () => {
    server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.error()));
    renderRoute('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server.');
  });

  it('shows an empty state when there are no featured products', async () => {
    featuredResponds([]);
    renderRoute('/');

    expect(await screen.findByText('There are no top rated products right now.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Top rated products' })).not.toBeInTheDocument();
  });
});
