import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Product } from '../api/types';
import { makeProduct, renderRoute } from '../test-support/render';
import { apiUrl, server } from '../test-support/server';

const JACKET = makeProduct({
  id: '3',
  title: 'Mens Cotton Jacket',
  description: 'Great outerwear jackets for Spring, Autumn and Winter.',
  price: 55.99,
  imageUrl: 'https://images.test/jacket.png',
  category: { slug: 'mens-clothing', name: "Men's Clothing" },
  rating: { rate: 4.7, count: 500 },
});

const NOT_FOUND_BODY = { error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } };

/** Serves `products` by id; any other id gets the API's 404. */
function productsRespond(...products: Product[]) {
  const requested: string[] = [];
  server.use(
    http.get(apiUrl('/products/:id'), ({ params }) => {
      const id = String(params['id']);
      requested.push(id);
      const product = products.find((candidate) => candidate.id === id);
      return product === undefined
        ? HttpResponse.json(NOT_FOUND_BODY, { status: 404 })
        : HttpResponse.json(product);
    }),
  );
  return requested;
}

describe('ProductPage (F4)', () => {
  it('shows every detail of the product', async () => {
    productsRespond(JACKET);
    renderRoute('/products/3');

    const article = await screen.findByRole('article', { name: 'Mens Cotton Jacket' });
    expect(within(article).getByRole('heading', { level: 1 })).toHaveTextContent('Mens Cotton Jacket');
    expect(within(article).getByRole('img', { name: 'Mens Cotton Jacket' })).toHaveAttribute(
      'src',
      'https://images.test/jacket.png',
    );
    expect(within(article).getByText('$55.99')).toBeInTheDocument();
    expect(within(article).getByText("Men's Clothing")).toBeInTheDocument();
    expect(within(article).getByText('Rated 4.7 out of 5 (500 ratings)')).toBeInTheDocument();
    expect(within(article).getByText('Great outerwear jackets for Spring, Autumn and Winter.')).toBeInTheDocument();
  });

  it('says so when a product has no ratings', async () => {
    productsRespond(makeProduct({ id: '4', title: 'Unrated Mug', rating: null }));
    renderRoute('/products/4');

    expect(await screen.findByText('No ratings yet')).toBeInTheDocument();
  });

  it('shows a loading message first', async () => {
    productsRespond(JACKET);
    renderRoute('/products/3');

    expect(screen.getByRole('status')).toHaveTextContent('Loading product…');
    await screen.findByRole('article');
  });

  it('shows "Product not found" with a way home for an unknown id', async () => {
    productsRespond(JACKET);
    const { router } = renderRoute('/products/999');

    expect(await screen.findByRole('heading', { level: 1, name: 'Product not found' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.json([])));
    await userEvent.setup().click(screen.getByRole('link', { name: 'Go to the home page' }));
    expect(router.state.location.pathname).toBe('/');
  });

  it('asks the API for the id from the URL, encoded', async () => {
    const requested = productsRespond(makeProduct({ id: 'a b', title: 'Spaced Id' }));
    renderRoute('/products/a%20b');

    await screen.findByRole('article', { name: 'Spaced Id' });
    expect(requested).toEqual(['a b']);
  });

  it('shows the API error with a retry for any other failure, and recovers', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/products/:id'), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'A service this request depends on is unavailable. Please try again.' } },
              { status: 502 },
            )
          : HttpResponse.json(JACKET);
      }),
    );
    renderRoute('/products/3');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A service this request depends on is unavailable.');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('article', { name: 'Mens Cotton Jacket' })).toBeInTheDocument();
  });
});

describe('from the home page (F4 acceptance criterion)', () => {
  it('clicking a product tile opens that product’s details page', async () => {
    server.use(
      http.get(apiUrl('/featured-products'), () =>
        HttpResponse.json([makeProduct({ id: '12', title: 'WD 4TB Gaming Drive', price: 114 }), JACKET]),
      ),
    );
    productsRespond(JACKET);
    const { router } = renderRoute('/');

    const tile = await screen.findByRole('link', { name: 'Mens Cotton Jacket $55.99' });
    await userEvent.setup().click(tile);

    expect(router.state.location.pathname).toBe('/products/3');
    expect(await screen.findByRole('heading', { level: 1, name: 'Mens Cotton Jacket' })).toBeInTheDocument();
  });
});
