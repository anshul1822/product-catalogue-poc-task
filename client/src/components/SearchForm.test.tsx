import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderRoute } from '../test-support/render';
import { apiUrl, server } from '../test-support/server';

/** Answers every search with no results, recording the terms asked for. */
function searchResponds() {
  const terms: (string | null)[] = [];
  server.use(
    http.get(apiUrl('/search'), ({ request }) => {
      terms.push(new URL(request.url).searchParams.get('q'));
      return HttpResponse.json([]);
    }),
  );
  return terms;
}

function searchBox() {
  const form = screen.getByRole('search');
  return {
    input: within(form).getByRole('searchbox', { name: 'Search products' }),
    button: within(form).getByRole('button', { name: 'Search' }),
  };
}

describe('SearchForm (F3, header)', () => {
  beforeEach(() => {
    server.use(http.get(apiUrl('/featured-products'), () => HttpResponse.json([])));
  });

  it('goes to the results page when the Search button is clicked', async () => {
    const terms = searchResponds();
    const { router } = renderRoute('/');
    const user = userEvent.setup();
    const { input, button } = searchBox();

    await user.type(input, 'jacket');
    await user.click(button);

    expect(router.state.location.pathname).toBe('/search');
    expect(router.state.location.search).toBe('?q=jacket');
    await screen.findByText('No products match “jacket”. Try a different word.');
    expect(terms).toEqual(['jacket']);
  });

  it('also submits on Enter', async () => {
    searchResponds();
    const { router } = renderRoute('/');

    await userEvent.setup().type(searchBox().input, 'gold{Enter}');

    expect(router.state.location.search).toBe('?q=gold');
    await screen.findByText('No products match “gold”. Try a different word.');
  });

  it('trims the term and encodes it in the URL', async () => {
    const terms = searchResponds();
    const { router } = renderRoute('/');

    await userEvent.setup().type(searchBox().input, '  cotton & jacket  {Enter}');

    expect(router.state.location.search).toBe('?q=cotton+%26+jacket');
    await screen.findByRole('heading', { level: 1, name: 'Search results for “cotton & jacket”' });
    expect(terms).toEqual(['cotton & jacket']);
  });

  it.each(['', '   '])('does nothing for the blank term %j: no navigation, no request', async (typed) => {
    const { router } = renderRoute('/');
    const user = userEvent.setup();
    const { input, button } = searchBox();

    if (typed !== '') {
      await user.type(input, typed);
    }
    await user.click(button);

    expect(router.state.location.pathname).toBe('/');
    expect(input).toHaveFocus();
    // Any request to /api/search here would fail the test (no handler registered).
  });

  it('limits the term to 100 characters, like the API', () => {
    renderRoute('/');

    expect(searchBox().input).toHaveAttribute('maxlength', '100');
  });

  it('shows the current term on the results page and clears it when leaving', async () => {
    searchResponds();
    const { router } = renderRoute('/search?q=jacket');

    expect(searchBox().input).toHaveValue('jacket');

    await userEvent.setup().click(screen.getByRole('link', { name: 'Product catalogue' }));

    expect(router.state.location.pathname).toBe('/');
    expect(searchBox().input).toHaveValue('');
  });
});
