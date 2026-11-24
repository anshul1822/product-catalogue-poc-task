import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Product } from '../api/types';
import { makeProduct, renderRoute } from '../test-support/render';
import { apiUrl, server } from '../test-support/server';

const JACKETS: Product[] = [
  makeProduct({ id: '3', title: 'Mens Cotton Jacket', price: 55.99 }),
  makeProduct({ id: '15', title: "BIYLACLESEN Women's 3-in-1 Snowboard Jacket", price: 56.99 }),
  makeProduct({ id: '16', title: "Lock and Love Women's Removable Hooded Jacket", price: 29.95 }),
  makeProduct({ id: '17', title: 'Rain Jacket Women Windbreaker', price: 39.99 }),
];

const OTHER = makeProduct({ id: '12', title: 'WD 4TB Gaming Drive', price: 114 });

/** A fake search that, like the real one, returns only the products whose title contains the term. */
function searchOver(products: Product[]) {
  const terms: (string | null)[] = [];
  server.use(
    http.get(apiUrl('/search'), ({ request }) => {
      const q = new URL(request.url).searchParams.get('q');
      terms.push(q);
      const needle = (q ?? '').toLowerCase();
      return HttpResponse.json(products.filter((product) => product.title.toLowerCase().includes(needle)));
    }),
  );
  return terms;
}

const hrefs = (list: HTMLElement): (string | null)[] =>
  within(list).getAllByRole('link').map((link) => link.getAttribute('href'));

describe('SearchPage (F3)', () => {
  it('shows the term, how many products match, and only those products', async () => {
    const terms = searchOver([...JACKETS, OTHER]);
    renderRoute('/search?q=jacket');

    expect(screen.getByRole('heading', { level: 1, name: 'Search results for “jacket”' })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Search results for “jacket”' });

    expect(hrefs(list)).toEqual(['/products/3', '/products/15', '/products/16', '/products/17']);
    expect(screen.getByText('4 products match')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /WD 4TB Gaming Drive/ })).not.toBeInTheDocument();
    expect(terms).toEqual(['jacket']);
  });

  it('says "1 product matches" for a single result', async () => {
    searchOver([...JACKETS, OTHER]);
    renderRoute('/search?q=gaming');

    expect(await screen.findByText('1 product matches')).toBeInTheDocument();
  });

  it('shows a message, not an empty grid, when nothing matches', async () => {
    searchOver(JACKETS);
    renderRoute('/search?q=zzzz');

    expect(await screen.findByText('No products match “zzzz”. Try a different word.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /Search results/ })).not.toBeInTheDocument();
  });

  it('shows a loading message first', async () => {
    searchOver(JACKETS);
    renderRoute('/search?q=jacket');

    expect(screen.getByRole('status')).toHaveTextContent('Searching…');
    await screen.findByRole('list', { name: 'Search results for “jacket”' });
  });

  it.each(['/search', '/search?q=', '/search?q=%20%20'])(
    'asks for a term at %s, without calling the API',
    (path) => {
      renderRoute(path);

      expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
      expect(screen.getByText('Enter a search term in the search bar to find products.')).toBeInTheDocument();
      // No /api/search handler is registered, so any request would fail the test.
    },
  );

  it('shows the API message without a retry for an invalid term (400)', async () => {
    server.use(
      http.get(apiUrl('/search'), () =>
        HttpResponse.json(
          { error: { code: 'INVALID_SEARCH_TERM', message: 'Use at most 100 characters.', details: { field: 'q' } } },
          { status: 400 },
        ),
      ),
    );
    renderRoute(`/search?q=${'x'.repeat(101)}`);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Use at most 100 characters.');
    expect(within(alert).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows the API error with a retry for other failures, and recovers', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/search'), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'A service this request depends on is unavailable. Please try again.' } },
              { status: 502 },
            )
          : HttpResponse.json(JACKETS);
      }),
    );
    renderRoute('/search?q=jacket');

    const alert = await screen.findByRole('alert');
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('4 products match')).toBeInTheDocument();
  });
});

describe('F3 acceptance criterion: searching from the search bar', () => {
  it('after typing a term and clicking Search, only products matching it are shown', async () => {
    server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.json([OTHER, JACKETS[0]])));
    searchOver([...JACKETS, OTHER]);
    renderRoute('/');
    await screen.findByRole('list', { name: 'Top rated products' });
    const user = userEvent.setup();

    const form = screen.getByRole('search');
    await user.type(within(form).getByRole('searchbox', { name: 'Search products' }), 'jacket');
    await user.click(within(form).getByRole('button', { name: 'Search' }));

    const list = await screen.findByRole('list', { name: 'Search results for “jacket”' });
    expect(hrefs(list)).toEqual(['/products/3', '/products/15', '/products/16', '/products/17']);
    expect(screen.queryByRole('link', { name: /WD 4TB Gaming Drive/ })).not.toBeInTheDocument();
  });

  it('a new search from the results page replaces the results', async () => {
    searchOver([...JACKETS, OTHER]);
    renderRoute('/search?q=jacket');
    await screen.findByText('4 products match');
    const user = userEvent.setup();

    const input = within(screen.getByRole('search')).getByRole('searchbox', { name: 'Search products' });
    await user.clear(input);
    await user.type(input, 'gaming{Enter}');

    const list = await screen.findByRole('list', { name: 'Search results for “gaming”' });
    expect(hrefs(list)).toEqual(['/products/12']);
  });
});
