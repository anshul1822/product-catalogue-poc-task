import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatPrice, Price } from './Price';

describe('formatPrice', () => {
  it.each([
    [55.99, '$55.99'],
    [695, '$695.00'],
    [1234.5, '$1,234.50'],
    [0, '$0.00'],
  ])('%d -> %s', (amount, expected) => {
    expect(formatPrice(amount)).toBe(expected);
  });
});

describe('Price', () => {
  it('renders the formatted amount', () => {
    render(<Price amount={9.85} />);

    expect(screen.getByText('$9.85')).toBeInTheDocument();
  });
});
