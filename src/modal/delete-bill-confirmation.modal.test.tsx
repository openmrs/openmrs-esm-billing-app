import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { deleteBill } from '../billing.resource';
import { type MappedBill } from '../types';
import DeleteBillModal from './delete-bill-confirmation.modal';

const mockDeleteBill = vi.mocked(deleteBill);
const mockShowSnackbar = vi.mocked(showSnackbar);

vi.mock('../billing.resource', () => ({
  deleteBill: vi.fn(),
}));

const mockBill = {
  uuid: 'bill-uuid',
  receiptNumber: 'RCPT-001',
} as MappedBill;

describe('DeleteBillModal', () => {
  const mockCloseModal = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls deleteBill with trimmed reason, fires onSuccess, shows success snackbar, and closes modal', async () => {
    const user = userEvent.setup();
    mockDeleteBill.mockResolvedValueOnce({} as any);

    render(<DeleteBillModal closeModal={mockCloseModal} bill={mockBill} onSuccess={mockOnSuccess} />);

    const deleteReasonInput = screen.getByLabelText(/Reason for deletion/i);
    await user.type(deleteReasonInput, 'Test delete reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteBill).toHaveBeenCalledWith(mockBill.uuid, 'Test delete reason');
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'success',
        subtitle: 'Bill deleted successfully',
        title: 'Bill deleted',
      });
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('shows error message from responseBody when delete fails', async () => {
    const user = userEvent.setup();

    mockDeleteBill.mockRejectedValueOnce({
      responseBody: {
        error: {
          message: 'Cannot delete paid bill',
        },
      },
    });

    render(<DeleteBillModal closeModal={mockCloseModal} bill={mockBill} onSuccess={mockOnSuccess} />);

    const deleteReasonInput = screen.getByLabelText(/Reason for deletion/i);
    await user.type(deleteReasonInput, 'Test delete reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        subtitle: 'Cannot delete paid bill',
        title: 'Failed to delete bill',
      });
    });
  });

  it('shows fallback error message when error has no responseBody message', async () => {
    const user = userEvent.setup();

    mockDeleteBill.mockRejectedValueOnce({});

    render(<DeleteBillModal closeModal={mockCloseModal} bill={mockBill} onSuccess={mockOnSuccess} />);

    const deleteReasonInput = screen.getByLabelText(/Reason for deletion/i);
    await user.type(deleteReasonInput, 'Test delete reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        subtitle: 'Unable to delete bill. Please try again.',
        title: 'Failed to delete bill',
      });
    });
  });

  it('disables delete button when reason is empty', () => {
    render(<DeleteBillModal closeModal={mockCloseModal} bill={mockBill} onSuccess={mockOnSuccess} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
  });

  it('disables delete button when reason contains only whitespace', async () => {
    const user = userEvent.setup();
    render(<DeleteBillModal closeModal={mockCloseModal} bill={mockBill} onSuccess={mockOnSuccess} />);

    const deleteReasonInput = screen.getByLabelText(/Reason for deletion/i);
    await user.type(deleteReasonInput, '   ');

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
  });

  it('trims reason before sending to API', async () => {
    const user = userEvent.setup();
    mockDeleteBill.mockResolvedValueOnce({} as any);

    render(<DeleteBillModal closeModal={mockCloseModal} bill={mockBill} onSuccess={mockOnSuccess} />);

    const deleteReasonInput = screen.getByLabelText(/Reason for deletion/i);
    await user.type(deleteReasonInput, '  Test delete reason with spaces  ');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteBill).toHaveBeenCalledWith(mockBill.uuid, 'Test delete reason with spaces');
    });
  });
});
