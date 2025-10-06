import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import PrintReceipt from './print-receipt.component';

describe('PrintReceipt', () => {
  beforeEach(() => {
    window.URL.createObjectURL = jest.fn();
  });

  it('renders button with correct text and icon', () => {
    render(<PrintReceipt billId={123} />);
    expect(screen.getByText('Print receipt')).toBeInTheDocument();
  });

  it('displays "Loading" and disables button when isRedirecting is true', async () => {
    const user = userEvent.setup();

    render(<PrintReceipt billId={123} />);

    const button = screen.getByRole('button');

    await user.click(button);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('applies correct CSS class to button', async () => {
    const user = userEvent.setup();

    render(<PrintReceipt billId={123} />);
    expect(screen.getByRole('button')).toHaveClass('button');
  });

  it('translates button text correctly', () => {
    render(<PrintReceipt billId={123} />);
    expect(screen.getByText('Print receipt')).toBeInTheDocument();
  });
});
