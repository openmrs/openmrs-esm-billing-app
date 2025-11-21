import React, { act } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import PrintReceipt from './print-receipt.component';

describe('PrintReceipt', () => {
  const TEST_BILL_UUID = 'a0655e54-126b-4b88-8c7c-579cb4f331f2';
  const originalLocation = window.location;
  let mockLink: HTMLAnchorElement;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        href: 'http://localhost:8080/openmrs/spa/home',
        origin: 'http://localhost:8080',
      },
      writable: true,
      configurable: true,
    });

    mockLink = document.createElement('a');
    jest.spyOn(mockLink, 'click').mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        mockLink.href = '';
        mockLink.download = '';
        return mockLink;
      }
      return originalCreateElement(tagName);
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('renders the print receipt button', () => {
    render(<PrintReceipt billUuid={TEST_BILL_UUID} />);

    const button = screen.getByRole('button', { name: /print receipt/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('shows loading state and disables button during download', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrintReceipt billUuid={TEST_BILL_UUID} />);

    const button = screen.getByRole('button', { name: /print receipt/i });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/print receipt/i)).not.toBeInTheDocument();
  });

  it('initiates download when button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrintReceipt billUuid={TEST_BILL_UUID} />);

    const button = screen.getByRole('button', { name: /print receipt/i });
    await user.click(button);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled();
    });

    expect(mockLink.href).toContain(TEST_BILL_UUID);
    expect(mockLink.href).toContain('receipt');
  });

  it('re-enables button after download completes', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrintReceipt billUuid={TEST_BILL_UUID} />);

    const button = screen.getByRole('button', { name: /print receipt/i });
    await user.click(button);

    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(button).toBeEnabled();
    });

    expect(screen.getByText(/print receipt/i)).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('prevents multiple simultaneous downloads', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrintReceipt billUuid={TEST_BILL_UUID} />);

    const button = screen.getByRole('button', { name: /print receipt/i });

    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(button).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  it('renders printer icon', () => {
    render(<PrintReceipt billUuid={TEST_BILL_UUID} />);

    const button = screen.getByRole('button', { name: /print receipt/i });
    expect(button).toBeInTheDocument();
  });

  it('handles empty bill UUID', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PrintReceipt billUuid="" />);

    const button = screen.getByRole('button', { name: /print receipt/i });
    await user.click(button);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
