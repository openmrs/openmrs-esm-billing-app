import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PrintReceipt from './print-receipt.component';
import { useTranslation } from 'react-i18next';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('@carbon/react/icons', () => ({
  Printer: jest.fn(() => <div data-testid="printer-icon" />),
}));

describe('PrintReceipt', () => {
  const mockT = jest.fn((key) => key);

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    jest.useFakeTimers();
    window.URL.createObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders button with correct text and icon', () => {
    render(<PrintReceipt billId={123} />);
    expect(screen.getByText('printReceipt')).toBeInTheDocument();
    expect(screen.getByTestId('printer-icon')).toBeInTheDocument();
  });

  it('displays "Loading" and disables button when isRedirecting is true', () => {
    render(<PrintReceipt billId={123} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('applies correct CSS class to button', () => {
    render(<PrintReceipt billId={123} />);
    expect(screen.getByRole('button')).toHaveClass('button');
  });

  it('translates button text correctly', () => {
    render(<PrintReceipt billId={123} />);
    expect(mockT).toHaveBeenCalledWith('printReceipt', 'Print receipt');
  });
});
