import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderRoute } from './test-support/render';
import { apiUrl, server } from './test-support/server';

describe('app routes', () => {
  beforeEach(() => {
    // The home page loads the featured products; these tests are about the frame around it.
    server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.json([])));
  });

  it('shows the layout and the home page at /', async () => {
    renderRoute('/');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Product catalogue' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { level: 1, name: 'Top rated products' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    await screen.findByText('There are no top rated products right now.');
  });

  it('offers a skip link to the main content', async () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    await screen.findByText('There are no top rated products right now.');
  });

  it('shows "Page not found" for an unknown URL, inside the layout', () => {
    renderRoute('/no/such/page');

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('goes back to the home page from the not-found page', async () => {
    const { router } = renderRoute('/no/such/page');

    await userEvent.setup().click(screen.getByRole('link', { name: 'Go to the home page' }));

    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Top rated products' })).toBeInTheDocument();
    await screen.findByText('There are no top rated products right now.');
  });
});
