import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderRoute } from '../test-support/render';
import { apiUrl, server } from '../test-support/server';

describe('CategoryNav (F2, header)', () => {
  beforeEach(() => {
    server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.json([])));
  });

  it('shows a link to each category, in the order the API returns them', async () => {
    renderRoute('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    const links = within(nav).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual(["Men's Clothing", 'Jewellery', 'Electronics', "Women's Clothing"]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/categories/mens-clothing',
      '/categories/jewellery',
      '/categories/electronics',
      '/categories/womens-clothing',
    ]);
  });

  it('marks the category being viewed as the current page', async () => {
    server.use(
      http.get(apiUrl('/categories/jewellery/products'), () =>
        HttpResponse.json({ category: { slug: 'jewellery', name: 'Jewellery' }, topRated: [], others: [] }),
      ),
    );
    renderRoute('/categories/jewellery');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });

    expect(within(nav).getByRole('link', { name: 'Jewellery' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Electronics' })).not.toHaveAttribute('aria-current');
  });

  it('shows no links, and no error, when the categories cannot be loaded; the page still works', async () => {
    server.use(
      http.get(apiUrl('/categories'), () =>
        HttpResponse.json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Unavailable.' } }, { status: 502 }),
      ),
    );
    renderRoute('/');

    expect(await screen.findByText('There are no top rated products right now.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
