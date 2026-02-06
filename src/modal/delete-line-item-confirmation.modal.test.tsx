import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { deleteBillItem } from '../billing.resource';
import DeleteLineItem from './delete-line-item-confirmation.modal';

const mockDeleteBillItem = jest.mocked(deleteBillItem);
const mockShowSnackbar = jest.mocked(showSnackbar);

jest.mock('../billing.resource', () => ({
  deleteBillItem: jest.fn(),
}));

const mockItem = {
  uuid: 'item-uuid',
  quantity: 2,
  price: 100,
  billableService: 'X-Ray Service',
  paymentStatus: 'UNPAID',
  item: 'Test Service',
  display: 'Test Service',
  voided: false,
  voidReason: null,
  priceName: 'Service Price',
  priceUuid: 'price-uuid',
  lineItemOrder: 1,
  resourceVersion: '1.0',
};

describe('DeleteLineItem Modal', () => {
  const mockCloseModal = jest.fn();
  const mockMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders delete confirmation modal', () => {
    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    expect(screen.getByText(/Delete line item/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this line item\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for void/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls closeModal when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('calls deleteBillItem API and shows success snackbar', async () => {
    const user = userEvent.setup();
    mockDeleteBillItem.mockResolvedValueOnce({} as any);

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteBillItem).toHaveBeenCalledWith(mockItem.uuid, 'Test void reason');
      expect(mockMutate).toHaveBeenCalled();
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'success',
        subtitle: 'Bill line item deleted successfully',
        title: 'Line item deleted',
      });
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('shows error snackbar when delete fails', async () => {
    const user = userEvent.setup();

    mockDeleteBillItem.mockRejectedValueOnce({ message: 'Delete failed' });

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        subtitle: 'Delete failed',
        title: 'Failed to delete line item',
      });
    });
  });

  it('disables delete button when void reason is empty', () => {
    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
  });

  it('enables delete button when void reason is filled', async () => {
    const user = userEvent.setup();
    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    expect(deleteButton).toBeEnabled();
  });

  it('disables delete button during deletion', async () => {
    const user = userEvent.setup();
    mockDeleteBillItem.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(screen.getByText(/deleting/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('shows inline loading indicator during deletion', async () => {
    const user = userEvent.setup();
    mockDeleteBillItem.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(screen.getByText(/deleting/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('shows error message from responseBody when delete fails', async () => {
    const user = userEvent.setup();

    mockDeleteBillItem.mockRejectedValueOnce({
      responseBody: {
        error: {
          message: 'Cannot delete paid line item',
        },
      },
    });

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        subtitle: 'Cannot delete paid line item',
        title: 'Failed to delete line item',
      });
    });
  });

  it('shows fallback error message when error has no message', async () => {
    const user = userEvent.setup();

    mockDeleteBillItem.mockRejectedValueOnce({});

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        subtitle: 'Unable to delete line item. Please try again.',
        title: 'Failed to delete line item',
      });
    });
  });

  it('works correctly when onMutate is not provided', async () => {
    const user = userEvent.setup();
    mockDeleteBillItem.mockResolvedValueOnce({} as any);

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteBillItem).toHaveBeenCalledWith(mockItem.uuid, 'Test void reason');
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('does not close modal when deletion fails', async () => {
    const user = userEvent.setup();

    mockDeleteBillItem.mockRejectedValueOnce({ message: 'Delete failed' });

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
    });

    expect(mockCloseModal).not.toHaveBeenCalled();
  });

  it('does not call onMutate when deletion fails', async () => {
    const user = userEvent.setup();

    mockDeleteBillItem.mockRejectedValueOnce({ message: 'Delete failed' });

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('re-enables delete button after failed deletion', async () => {
    const user = userEvent.setup();
    mockDeleteBillItem.mockRejectedValueOnce({ message: 'Delete failed' });

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, 'Test void reason');

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
    });

    expect(deleteButton).toBeEnabled();
  });

  it('trims void reason before sending to API', async () => {
    const user = userEvent.setup();
    mockDeleteBillItem.mockResolvedValueOnce({} as any);

    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, '  Test void reason with spaces  ');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteBillItem).toHaveBeenCalledWith(mockItem.uuid, 'Test void reason with spaces');
    });
  });

  it('disables delete button when void reason contains only whitespace', async () => {
    const user = userEvent.setup();
    render(<DeleteLineItem closeModal={mockCloseModal} item={mockItem} onMutate={mockMutate} />);

    const voidReasonInput = screen.getByLabelText(/Reason for void/i);
    await user.type(voidReasonInput, '   ');

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();
  });
});
