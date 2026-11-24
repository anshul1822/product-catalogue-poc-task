import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from './test-support/render';

describe('app routes', () => {
  it('shows the layout and the home page at /', () => {
    renderRoute('/');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Product catalogue' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { level: 1, name: 'Product catalogue' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('offers a skip link to the main content', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
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
    expect(screen.getByRole('heading', { level: 1, name: 'Product catalogue' })).toBeInTheDocument();
  });
});
