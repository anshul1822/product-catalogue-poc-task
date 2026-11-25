import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeProduct, renderRoute } from '../test-support/render';
import { apiUrl, server } from '../test-support/server';

const JACKET = makeProduct({ id: '3', title: 'Mens Cotton Jacket', price: 55.99 });

/** Answers POST /api/enquiries with `respond`, recording every body sent. */
function enquiriesRespond(respond: (body: unknown) => Response) {
  const bodies: unknown[] = [];
  server.use(
    http.post(apiUrl('/enquiries'), async ({ request }) => {
      const body: unknown = await request.json();
      bodies.push(body);
      return respond(body);
    }),
  );
  return bodies;
}

const received = () => HttpResponse.json({ status: 'received' }, { status: 201 });

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Your name'), 'Ada Lovelace');
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Phone (optional)'), '0412 345 678');
  await user.type(screen.getByLabelText('Message (optional)'), 'Is it waterproof?');
}

describe('EnquirePage (F5)', () => {
  beforeEach(() => {
    server.use(http.get(apiUrl('/products/3'), () => HttpResponse.json(JACKET)));
  });

  it('names the product the enquiry is about', async () => {
    renderRoute('/products/3/enquire');

    expect(await screen.findByRole('heading', { level: 1, name: 'Enquire about this product' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mens Cotton Jacket' })).toHaveAttribute('href', '/products/3');
    expect(screen.getByText('$55.99')).toBeInTheDocument();
  });

  it('sends the contact details with the product id, then shows "Thank you"', async () => {
    const bodies = enquiriesRespond(received);
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const thankYou = await screen.findByRole('heading', { level: 1, name: 'Thank you' });
    expect(thankYou).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your enquiry about Mens Cotton Jacket has been sent. Our sales team will reply to ada@example.com.',
    );
    expect(bodies).toEqual([
      { productId: '3', name: 'Ada Lovelace', email: 'ada@example.com', phone: '0412 345 678', message: 'Is it waterproof?', website: '' },
    ]);
    expect(screen.queryByRole('button', { name: 'Send enquiry' })).not.toBeInTheDocument();
  });

  it('shows the field errors and sends nothing when required fields are missing or invalid', async () => {
    const bodies = enquiriesRespond(received);
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email address'), 'ada.example.com');
    await user.type(screen.getByLabelText('Phone (optional)'), 'call me');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const name = screen.getByLabelText('Your name');
    expect(name).toHaveAccessibleDescription('Enter your name.');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription('Enter a valid email address, like name@example.com.');
    expect(screen.getByLabelText('Phone (optional)')).toHaveAccessibleDescription(
      'Enter a phone number using digits, spaces and + ( ) - only.',
    );
    expect(bodies).toEqual([]);
  });

  it('clears a field’s error as soon as it is edited', async () => {
    enquiriesRespond(received);
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));
    expect(screen.getByLabelText('Your name')).toHaveAccessibleDescription('Enter your name.');

    await user.type(screen.getByLabelText('Your name'), 'A');

    expect(screen.getByLabelText('Your name')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the server’s field errors from a 400 next to the fields', async () => {
    enquiriesRespond(() =>
      HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.', details: { fields: { email: 'Your email address must be on one line.' } } } },
        { status: 400 },
      ),
    );
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByText('Your email address must be on one line.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveFocus();
  });

  it('keeps everything typed and explains when sending fails, then sends on retry', async () => {
    let calls = 0;
    enquiriesRespond(() => {
      calls += 1;
      return calls === 1
        ? HttpResponse.json(
            { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'A service this request depends on is unavailable. Please try again.' } },
            { status: 502 },
          )
        : received();
    });
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your enquiry could not be sent. Please try again. What you typed is still here.',
    );
    expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText('Email address')).toHaveValue('ada@example.com');
    expect(screen.getByLabelText('Message (optional)')).toHaveValue('Is it waterproof?');

    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('shows the server’s message when the rate limit is reached', async () => {
    enquiriesRespond(() =>
      HttpResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'You have sent a lot of enquiries. Please wait a few minutes and try again.' } },
        { status: 429 },
      ),
    );
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You have sent a lot of enquiries.');
  });

  it('disables the button while sending, so a double click sends once', async () => {
    let release: (() => void) | undefined;
    const bodies: unknown[] = [];
    server.use(
      http.post(apiUrl('/enquiries'), async ({ request }) => {
        bodies.push(await request.json());
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return received();
      }),
    );
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const button = await screen.findByRole('button', { name: 'Sending…' });
    expect(button).toBeDisabled();
    await user.click(button);
    release?.();

    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
  });

  it('hides the honeypot from people and assistive technology', async () => {
    renderRoute('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });

    expect(screen.queryByRole('textbox', { name: 'Website' })).not.toBeInTheDocument();
    expect(document.getElementById('enquiry-website')).toHaveAttribute('tabindex', '-1');
  });

  it('shows "Product not found" for an unknown product', async () => {
    server.use(
      http.get(apiUrl('/products/999'), () =>
        HttpResponse.json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found.' } }, { status: 404 }),
      ),
    );
    renderRoute('/products/999/enquire');

    expect(await screen.findByRole('heading', { level: 1, name: 'Product not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send enquiry' })).not.toBeInTheDocument();
  });
});

describe('F5 acceptance criterion: from the product page to "Thank you"', () => {
  it('Enquire on the product page opens the form; submitting it shows "Thank you"', async () => {
    server.use(http.get(apiUrl('/products/3'), () => HttpResponse.json(JACKET)));
    const bodies = enquiriesRespond(received);
    const { router } = renderRoute('/products/3');
    const user = userEvent.setup();

    const article = await screen.findByRole('article', { name: 'Mens Cotton Jacket' });
    await user.click(within(article).getByRole('link', { name: 'Enquire' }));

    expect(router.state.location.pathname).toBe('/products/3/enquire');
    await screen.findByRole('heading', { name: 'Enquire about this product' });
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Thank you' })).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
  });
});
