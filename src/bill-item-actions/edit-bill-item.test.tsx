import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, showSnackbar } from '@openmrs/esm-framework';
import { type MappedBill } from '../types';
import { updateBillItems } from '../billing.resource';
import ChangeStatus from './edit-bill-item.component';

const mockUpdateBillItems = jest.mocked(updateBillItems);
const mockShowSnackbar = jest.mocked(showSnackbar);

jest.mock('../billing.resource', () => ({
  updateBillItems: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../billable-services/billable-service.resource', () => ({
  useBillableServices: jest.fn(() => ({
    billableServices: [],
  })),
}));

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
      billableService: 'service-uuid',
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
  billableService: 'service-uuid',
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

describe('ChangeStatus component', () => {
  const closeModalMock = jest.fn();

  test('renders the form with correct fields and default values', () => {
    render(<ChangeStatus bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    expect(screen.getByText('Edit bill line item?')).toBeInTheDocument();
    expect(screen.getByText('John Doe · Main Cashpoint · 123456')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Quantity/ })).toHaveValue(2);
    expect(screen.getByLabelText(/Unit Price/)).toHaveValue('100');
    expect(screen.getByText(/Total/)).toHaveTextContent('200');
  });

  test('updates total when quantity is changed', async () => {
    const user = userEvent.setup();
    render(<ChangeStatus bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/ });
    await user.type(quantityInput, '3');

    expect(screen.getByText(/Total/)).toHaveTextContent('300');
  });

  test('submits the form and shows a success notification', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockResolvedValueOnce({} as FetchResponse<any>);

    render(<ChangeStatus bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(mockUpdateBillItems).toHaveBeenCalled();
      expect(showSnackbar).toHaveBeenCalledWith({
        title: 'Save Bill',
        subtitle: 'Bill processing has been successful',
        kind: 'success',
        timeoutInMs: 3000,
      });
      expect(closeModalMock).toHaveBeenCalled();
    });
  });

  test('shows error notification when submission fails', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockRejectedValueOnce({ message: 'Error occurred' });

    render(<ChangeStatus bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        title: 'Bill processing error',
        kind: 'error',
        subtitle: 'Error occurred',
      });
    });
  });
});
