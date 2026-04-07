import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { finalizeBill } from '../billing.resource';
import FinalizeBillModal from './finalize-bill-confirmation.modal';
import type { MappedBill } from '../types';
import { BillStatus } from '../types';

const mockFinalizeBill = jest.mocked(finalizeBill);
const mockShowSnackbar = jest.mocked(showSnackbar);

jest.mock('../billing.resource', () => ({
  finalizeBill: jest.fn(),
}));

const mockBill: MappedBill = {
  uuid: 'bill-uuid',
  id: 1,
  patientUuid: 'patient-uuid',
  patientName: 'John Doe',
  cashPointUuid: 'cash-point-uuid',
  cashPointName: 'Main Cashier',
  cashPointLocation: 'Main Hospital',
  cashier: { uuid: 'cashier-uuid', display: 'Jane Cashier', links: [] },
  receiptNumber: 'RCPT-001',
  status: BillStatus.PENDING,
  identifier: '12345678',
  dateCreated: '2024-01-01',
  lineItems: [
    {
      uuid: 'item-1',
      item: 'X-Ray',
      quantity: 1,
      price: 500,
      paymentStatus: BillStatus.PENDING,
      billableService: 'X-Ray Service',
    },
  ],
  billingService: 'X-Ray Service',
  payments: [],
  totalAmount: 500,
  tenderedAmount: 0,
};

describe('FinalizeBillModal', () => {
  const mockCloseModal = jest.fn();
  const mockMutate = jest.fn();

  it('renders the confirmation modal with correct content', () => {
    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    expect(screen.getByText(/finalize bill/i)).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to finalize this bill\? once finalized, no further modifications/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finalize/i })).toBeInTheDocument();
  });

  it('calls closeModal when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('calls finalizeBill with bill uuid and shows success snackbar', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockResolvedValueOnce({} as any);

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    await user.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => {
      expect(mockFinalizeBill).toHaveBeenCalledWith('bill-uuid');
      expect(mockMutate).toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'success',
        title: 'Bill finalized',
        subtitle: 'Bill has been finalized successfully',
      });
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('calls onMutate before closeModal on success', async () => {
    const user = userEvent.setup();
    const callOrder: string[] = [];
    mockFinalizeBill.mockResolvedValueOnce({} as any);
    mockMutate.mockImplementation(() => callOrder.push('onMutate'));
    mockCloseModal.mockImplementation(() => callOrder.push('closeModal'));

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);
    await user.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
    expect(callOrder).toEqual(['onMutate', 'closeModal']);
  });

  it('shows error snackbar when finalize fails', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockRejectedValueOnce({ message: 'Network error' });

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    await user.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        title: 'Failed to finalize bill',
        subtitle: 'Network error',
      });
    });
    expect(mockCloseModal).not.toHaveBeenCalled();
  });

  it('shows error from responseBody when available', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockRejectedValueOnce({
      responseBody: { error: { message: 'Bill cannot be finalized' } },
    });

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    await user.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ subtitle: 'Bill cannot be finalized' }));
    });
  });

  it('shows fallback error message when error has no message', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockRejectedValueOnce({});

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    await user.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ subtitle: 'Unable to finalize bill. Please try again.' }),
      );
    });
  });

  it('disables buttons and shows loading state while finalizing', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    const finalizeButton = screen.getByRole('button', { name: /finalize/i });
    await user.click(finalizeButton);

    expect(finalizeButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByText(/finalizing/i)).toBeInTheDocument();

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
  });

  it('re-enables finalize button after failed finalization', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockRejectedValueOnce({ message: 'error' });

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    const finalizeButton = screen.getByRole('button', { name: /finalize/i });
    await user.click(finalizeButton);

    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));

    expect(finalizeButton).toBeEnabled();
  });

  it('does not call onMutate when finalization fails', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockRejectedValueOnce({ message: 'error' });

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} onMutate={mockMutate} />);

    await user.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('works correctly when onMutate is not provided', async () => {
    const user = userEvent.setup();
    mockFinalizeBill.mockResolvedValueOnce({} as any);

    render(<FinalizeBillModal closeModal={mockCloseModal} bill={mockBill} />);

    await user.click(screen.getByRole('button', { name: /finalize/i }));

    await waitFor(() => {
      expect(mockFinalizeBill).toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });
});
