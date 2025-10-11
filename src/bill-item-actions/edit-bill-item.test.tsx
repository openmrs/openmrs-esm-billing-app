import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, showSnackbar } from '@openmrs/esm-framework';
import { type MappedBill } from '../types';
import { updateBillItems } from '../billing.resource';
import EditBillLineItemModal from './edit-bill-item.modal';

const mockUpdateBillItems = jest.mocked(updateBillItems);
const mockShowSnackbar = jest.mocked(showSnackbar);

jest.mock('../billing.resource', () => ({
  updateBillItems: jest.fn(() => Promise.resolve({})),
}));

const mockBillableServices = [
  { name: 'X-Ray Service', uuid: 'xray-uuid-123' },
  { name: 'Lab Test Service', uuid: 'lab-uuid-456' },
  { name: 'Consultation Service', uuid: 'consult-uuid-789' },
];

jest.mock('../billable-services/billable-service.resource', () => ({
  useBillableServices: jest.fn(() => ({
    billableServices: mockBillableServices,
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

describe('ChangeStatus component', () => {
  const closeModalMock = jest.fn();

  test('renders the form with correct fields and default values', () => {
    render(<EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    expect(screen.getByText('Edit bill line item')).toBeInTheDocument();
    expect(screen.getByText('John Doe · Main Cashpoint · 123456')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Quantity/ })).toHaveValue(2);
    expect(screen.getByLabelText(/Unit Price/)).toHaveValue('100');
    expect(screen.getByText(/Total/)).toHaveTextContent('200');
  });

  test('updates total when quantity is changed', async () => {
    const user = userEvent.setup();
    render(<EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/ });
    await user.type(quantityInput, '3');

    expect(screen.getByText(/Total/)).toHaveTextContent('300');
  });

  test('submits the form and shows a success notification', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockResolvedValueOnce({} as FetchResponse<any>);

    render(<EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(mockUpdateBillItems).toHaveBeenCalled();
      expect(showSnackbar).toHaveBeenCalledWith({
        title: 'Line item updated',
        subtitle: 'The bill line item has been updated successfully',
        kind: 'success',
      });
      expect(closeModalMock).toHaveBeenCalled();
    });
  });

  test('shows error notification when submission fails', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockRejectedValueOnce({ message: 'Error occurred' });

    render(<EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={closeModalMock} />);

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        title: 'Failed to update line item',
        kind: 'error',
        subtitle: 'Error occurred',
      });
    });
  });

  test('preserves billable service UUIDs for other line items when editing', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockResolvedValueOnce({} as FetchResponse<any>);

    // Bill with multiple line items with different billable services
    const billWithMultipleItems: MappedBill = {
      ...mockBill,
      lineItems: [
        {
          uuid: 'item-1',
          quantity: 1,
          price: 100,
          billableService: 'X-Ray Service',
          paymentStatus: 'PENDING',
          item: 'X-Ray',
          display: 'X-Ray',
          voided: false,
          voidReason: null,
          priceName: 'X-Ray Price',
          priceUuid: 'xray-price-uuid',
          lineItemOrder: 1,
          resourceVersion: '1.0',
        },
        {
          uuid: 'item-2',
          quantity: 2,
          price: 50,
          billableService: 'Lab Test Service',
          paymentStatus: 'PENDING',
          item: 'Lab Test',
          display: 'Lab Test',
          voided: false,
          voidReason: null,
          priceName: 'Lab Price',
          priceUuid: 'lab-price-uuid',
          lineItemOrder: 2,
          resourceVersion: '1.0',
        },
        {
          uuid: 'item-3',
          quantity: 1,
          price: 200,
          billableService: 'Consultation Service',
          paymentStatus: 'PENDING',
          item: 'Consultation',
          display: 'Consultation',
          voided: false,
          voidReason: null,
          priceName: 'Consult Price',
          priceUuid: 'consult-price-uuid',
          lineItemOrder: 3,
          resourceVersion: '1.0',
        },
      ],
    };

    // Editing the Lab Test item (item-2)
    const itemToEdit = billWithMultipleItems.lineItems[1];

    render(<EditBillLineItemModal bill={billWithMultipleItems} item={itemToEdit} closeModal={closeModalMock} />);

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(mockUpdateBillItems).toHaveBeenCalled();
      const payload = mockUpdateBillItems.mock.calls[0][0];

      // Verify that each line item has the correct billable service UUID
      const xrayItem = payload.lineItems.find((li) => li.uuid === 'item-1');
      const consultItem = payload.lineItems.find((li) => li.uuid === 'item-3');

      // These should NOT have the Lab Test UUID (lab-uuid-456)
      // They should keep their original UUIDs
      expect(xrayItem?.billableService).toBe('xray-uuid-123');
      expect(consultItem?.billableService).toBe('consult-uuid-789');

      // The edited item should have the Lab Test UUID
      const labItem = payload.lineItems.find((li) => li.uuid === 'item-2');
      expect(labItem?.billableService).toBe('lab-uuid-456');
    });
  });
});
