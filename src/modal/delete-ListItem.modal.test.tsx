import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteListItem from './delete-ListItem.modal';
import { showSnackbar, openmrsFetch } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import { apiBasePath } from '../constants';
import { type MappedBill } from '../types';

jest.mock('@openmrs/esm-framework', () => ({
  showSnackbar: jest.fn(),
  openmrsFetch: jest.fn(),
  getCoreTranslation: (key: string) => key,
}));

jest.mock('swr', () => ({
  useSWRConfig: jest.fn(),
}));

const mockMutate = jest.fn();
(useSWRConfig as jest.Mock).mockReturnValue({ mutate: mockMutate });

const mockCloseModal = jest.fn();

const mockBill: MappedBill = {
  id: 1,
  uuid: 'bill-uuid',
  patientUuid: 'patient-uuid',
  cashier: {
    uuid: 'cashier-uuid',
    display: 'John Doe',
    links: [],
  },
  cashPointUuid: 'cashpoint-uuid',
  cashPointLocation: 'Main Location',
  status: 'PENDING',
  lineItems: [
    {
      uuid: 'item-uuid',
      quantity: 2,
      price: 100,
      display: 'Test Item',
      voided: false,
      voidReason: null,
      priceName: 'Service Price',
      billableService: 'X-Ray Service',
      priceUuid: 'price-uuid',
      lineItemOrder: 1,
      resourceVersion: '1.0',
      item: 'Test Item',
      paymentStatus: 'PENDING',
    },
  ],
  dateCreated: new Date().toISOString(),
  billingService: 'billing-service-uuid',
  payments: [],
  patientName: 'John Doe',
  cashPointName: 'Main Cashpoint',
  receiptNumber: '123456',
  identifier: 'receipt-identifier',
};

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

describe('DeleteListItem Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders delete confirmation modal', () => {
    render(<DeleteListItem closeModal={mockCloseModal} item={mockItem} />);

    expect(screen.getByText(/Delete list item/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this record/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('Calls closeDeleteModal when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(<DeleteListItem closeModal={mockCloseModal} item={mockItem} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('calls DELETE API and shows success snackbar', async () => {
    const user = userEvent.setup();
    // Mock successful API response
    (openmrsFetch as jest.Mock).mockResolvedValueOnce({});

    render(<DeleteListItem closeModal={mockCloseModal} item={mockItem} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(openmrsFetch).toHaveBeenCalledWith(`${apiBasePath}billLineItem/${mockItem.uuid}`, {
        method: 'DELETE',
      });
      expect(mockMutate).toHaveBeenCalledWith(expect.any(Function), undefined, { revalidate: true });
      expect(showSnackbar).toHaveBeenCalledWith({
        kind: 'success',
        subtitle: 'The bill line item has been removed successfully',
        title: 'Line item deleted',
      });
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('shows error snackbar when delete fails', async () => {
    const user = userEvent.setup();

    (openmrsFetch as jest.Mock).mockRejectedValueOnce({ message: 'Delete failed' });

    render(<DeleteListItem closeModal={mockCloseModal} item={mockItem} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(showSnackbar).toHaveBeenCalledWith({
        kind: 'error',
        subtitle: 'Delete failed',
        title: 'Failed to delete line item',
      });
    });
  });
});
