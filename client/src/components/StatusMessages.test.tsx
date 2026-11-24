import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingState } from './StatusMessages';

describe('LoadingState', () => {
  it('is announced as a status', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});

describe('ErrorState', () => {
  it('is announced as an alert with the message', () => {
    render(<ErrorState message="Cannot reach the server." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the server.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRetry when "Try again" is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Failed." onRetry={onRetry} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('renders its message', () => {
    render(<EmptyState>No products match "zzz".</EmptyState>);

    expect(screen.getByText('No products match "zzz".')).toBeInTheDocument();
  });
});
