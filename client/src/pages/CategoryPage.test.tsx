import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { CategoryPage as CategoryPageData } from '../api/types';
import { makeProduct, renderRoute } from '../test-support/render';
import { apiUrl, server } from '../test-support/server';

const ELECTRONICS = { slug: 'electronics', name: 'Electronics' };

const ELECTRONICS_PAGE: CategoryPageData = {
  category: ELECTRONICS,
  topRated: [
    makeProduct({ id: '12', title: 'WD 4TB Gaming Drive', price: 114, category: ELECTRONICS }),
    makeProduct({ id: '11', title: 'Silicon Power 256GB SSD', price: 109, category: ELECTRONICS }),
  ],
  others: [
    makeProduct({ id: '9', title: 'WD 2TB Elements', price: 64, category: ELECTRONICS }),
    makeProduct({ id: '10', title: 'SanDisk SSD PLUS 1TB', price: 109, category: ELECTRONICS }),
  ],
};

function categoryResponds(slug: string, page: CategoryPageData) {
  const requested: string[] = [];
  server.use(
    http.get(apiUrl('/categories/:slug/products'), ({ params }) => {
      requested.push(String(params['slug']));
      return String(params['slug']) === slug
        ? HttpResponse.json(page)
        : HttpResponse.json({ error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found.' } }, { status: 404 });
    }),
  );
  return requested;
}

const hrefs = (list: HTMLElement): (string | null)[] =>
  within(list).getAllByRole('link').map((link) => link.getAttribute('href'));

describe('CategoryPage (F2)', () => {
  it('shows the top rated products of the category, then the rest', async () => {
    categoryResponds('electronics', ELECTRONICS_PAGE);
    renderRoute('/categories/electronics');

    expect(await screen.findByRole('heading', { level: 1, name: 'Electronics' })).toBeInTheDocument();

    const topRated = screen.getByRole('list', { name: 'Top rated in Electronics' });
    const more = screen.getByRole('list', { name: 'More in Electronics' });
    expect(hrefs(topRated)).toEqual(['/products/12', '/products/11']);
    expect(hrefs(more)).toEqual(['/products/9', '/products/10']);
    expect(screen.getByRole('heading', { level: 2, name: 'Top rated in Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'More in Electronics' })).toBeInTheDocument();
  });

  it('hides a section that has no products', async () => {
    categoryResponds('electronics', { ...ELECTRONICS_PAGE, others: [] });
    renderRoute('/categories/electronics');

    expect(await screen.findByRole('list', { name: 'Top rated in Electronics' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'More in Electronics' })).not.toBeInTheDocument();
  });

  it('shows a loading message first', async () => {
    categoryResponds('electronics', ELECTRONICS_PAGE);
    renderRoute('/categories/electronics');

    expect(screen.getByRole('status')).toHaveTextContent('Loading category…');
    await screen.findByRole('heading', { level: 1, name: 'Electronics' });
  });

  it('shows "Category not found" with a way home for an unknown slug', async () => {
    categoryResponds('electronics', ELECTRONICS_PAGE);
    renderRoute('/categories/toys');

    expect(await screen.findByRole('heading', { level: 1, name: 'Category not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the API error with a retry for any other failure, and recovers', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/categories/:slug/products'), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'A service this request depends on is unavailable. Please try again.' } },
              { status: 502 },
            )
          : HttpResponse.json(ELECTRONICS_PAGE);
      }),
    );
    renderRoute('/categories/electronics');

    const alert = await screen.findByRole('alert');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Electronics' })).toBeInTheDocument();
  });
});

describe('F2 acceptance criterion: clicking a category link', () => {
  it('in the header opens that category page, with its top rated and other products', async () => {
    server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.json([])));
    const requested = categoryResponds('electronics', ELECTRONICS_PAGE);
    const { router } = renderRoute('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    await userEvent.setup().click(within(nav).getByRole('link', { name: 'Electronics' }));

    expect(router.state.location.pathname).toBe('/categories/electronics');
    expect(await screen.findByRole('list', { name: 'Top rated in Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'More in Electronics' })).toBeInTheDocument();
    expect(requested).toEqual(['electronics']);
  });

  it('on a product page opens that product’s category', async () => {
    const jacket = makeProduct({ id: '3', title: 'Mens Cotton Jacket', category: { slug: 'mens-clothing', name: "Men's Clothing" } });
    server.use(http.get(apiUrl('/products/3'), () => HttpResponse.json(jacket)));
    categoryResponds('mens-clothing', { category: jacket.category, topRated: [jacket], others: [] });
    const { router } = renderRoute('/products/3');

    const article = await screen.findByRole('article', { name: 'Mens Cotton Jacket' });
    await userEvent.setup().click(within(article).getByRole('link', { name: "Men's Clothing" }));

    expect(router.state.location.pathname).toBe('/categories/mens-clothing');
    expect(await screen.findByRole('heading', { level: 1, name: "Men's Clothing" })).toBeInTheDocument();
  });
});
