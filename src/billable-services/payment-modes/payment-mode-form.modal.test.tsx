import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { showSnackbar, type FetchResponse } from '@openmrs/esm-framework';
import { createPaymentMode, updatePaymentMode } from '../billable-service.resource';
import PaymentModeFormModal from './payment-mode-form.modal';

const mockCreatePaymentMode = vi.mocked(createPaymentMode);
const mockUpdatePaymentMode = vi.mocked(updatePaymentMode);
const mockShowSnackbar = vi.mocked(showSnackbar);

vi.mock('../billable-service.resource', () => ({
  createPaymentMode: vi.fn(),
  updatePaymentMode: vi.fn(),
}));

describe('PaymentModeFormModal', () => {
  const closeModal = vi.fn();

  beforeEach(() => {
    mockCreatePaymentMode.mockResolvedValue({} as FetchResponse);
    mockUpdatePaymentMode.mockResolvedValue({} as FetchResponse);
  });

  it('shows a validation error and does not submit when the name is empty', async () => {
    const user = userEvent.setup();
    render(<PaymentModeFormModal closeModal={closeModal} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Payment mode name is required')).toBeInTheDocument();
    expect(mockCreatePaymentMode).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('creates a payment mode with the entered values', async () => {
    const user = userEvent.setup();
    render(<PaymentModeFormModal closeModal={closeModal} />);

    expect(screen.getByText('Add payment mode')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Payment mode name'), 'Mobile money');
    await user.type(screen.getByLabelText('Description'), 'M-Pesa and similar');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1));
    expect(mockCreatePaymentMode).toHaveBeenCalledWith({ name: 'Mobile money', description: 'M-Pesa and similar' });
    expect(mockUpdatePaymentMode).not.toHaveBeenCalled();
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('prefills the form when editing and submits the changes to the existing payment mode', async () => {
    const user = userEvent.setup();
    render(
      <PaymentModeFormModal
        closeModal={closeModal}
        editPaymentMode={{ uuid: 'payment-mode-uuid', name: 'Cash', description: 'Cash payments' }}
      />,
    );

    expect(screen.getByText('Edit payment mode')).toBeInTheDocument();
    const nameInput = screen.getByLabelText('Payment mode name');
    expect(nameInput).toHaveValue('Cash');
    expect(screen.getByLabelText('Description')).toHaveValue('Cash payments');

    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText('Payment mode name is required')).toBeInTheDocument();
    expect(mockUpdatePaymentMode).not.toHaveBeenCalled();

    await user.type(nameInput, 'Cash (KES)');
    expect(screen.queryByText('Payment mode name is required')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1));
    expect(mockUpdatePaymentMode).toHaveBeenCalledWith('payment-mode-uuid', {
      name: 'Cash (KES)',
      description: 'Cash payments',
    });
    expect(mockCreatePaymentMode).not.toHaveBeenCalled();
  });

  it('keeps the modal open and shows an error when saving fails', async () => {
    const user = userEvent.setup();
    mockCreatePaymentMode.mockRejectedValue(new Error('Server error'));
    render(<PaymentModeFormModal closeModal={closeModal} />);

    await user.type(screen.getByLabelText('Payment mode name'), 'Mobile money');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', subtitle: 'Server error' }),
      ),
    );
    expect(closeModal).not.toHaveBeenCalled();
  });
});
