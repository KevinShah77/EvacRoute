import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBanner from './ErrorBanner';

describe('ErrorBanner Component', () => {
  test('renders nothing when error is null or undefined', () => {
    const { container } = render(<ErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders error message and dismisses on click', () => {
    const onDismiss = jest.fn();
    render(<ErrorBanner error="Connection lost to backend" onDismiss={onDismiss} />);

    expect(screen.getByText('Connection lost to backend')).toBeInTheDocument();
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
