import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, getDefaultsFromConfigSchema, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { type MappedBill } from '../types';
import { updateBillItems } from '../billing.resource';
import EditBillLineItemModal from './edit-bill-item.modal';

const mockUpdateBillItems = vi.mocked(updateBillItems);
const mockShowSnackbar = vi.mocked(showSnackbar);
const mockUseConfig = vi.mocked(useConfig<BillingConfig>);

const mockBillableServices = [
  { name: 'X-Ray Service', uuid: 'xray-uuid-123' },
  { name: 'Lab Test Service', uuid: 'lab-uuid-456' },
  { name: 'Consultation Service', uuid: 'consult-uuid-789' },
];

vi.mock('../billing.resource', () => ({
  updateBillItems: vi.fn().mockResolvedValue({}),
}));

vi.mock('../billable-services/billable-service.resource', () => ({
  useBillableServices: vi.fn(() => ({
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

describe('EditBillItem', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      defaultCurrency: 'USD',
    });
  });

  const mockCloseModal = vi.fn();
  const mockOnMutate = vi.fn();

  it('renders the form with correct fields and default values', () => {
    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    expect(screen.getByText(/edit bill line item/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Main Cashpoint/)).toBeInTheDocument();
    expect(screen.getByText(/123456/)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /quantity/i })).toHaveValue(2);
    expect(screen.getByLabelText(/unit price/i)).toHaveValue('100');
    expect(screen.getByText(/total/i)).toHaveTextContent(/200/);
  });

  it('updates total when quantity is changed', async () => {
    const user = userEvent.setup();
    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');

    expect(screen.getByText(/total/i)).toHaveTextContent(/300/);
  });

  it('submits the form and shows a success notification', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockResolvedValueOnce({} as FetchResponse<any>);

    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    await user.click(screen.getByText(/save/i));

    await waitFor(() => {
      expect(mockUpdateBillItems).toHaveBeenCalled();
      expect(mockOnMutate).toHaveBeenCalled();
      expect(showSnackbar).toHaveBeenCalledWith({
        title: 'Line item updated',
        subtitle: 'The bill line item has been updated successfully',
        kind: 'success',
      });
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('shows error notification when submission fails', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockRejectedValueOnce({ message: 'Error occurred' });

    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith({
        title: 'Failed to update line item',
        kind: 'error',
        subtitle: 'Error occurred',
      });
    });
  });

  it('preserves billable service UUIDs for other line items when editing', async () => {
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

    render(
      <EditBillLineItemModal
        bill={billWithMultipleItems}
        item={itemToEdit}
        closeModal={mockCloseModal}
        onMutate={mockOnMutate}
      />,
    );

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

  it('shows validation error for quantity less than 1', async () => {
    const user = userEvent.setup();
    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/ });
    await user.clear(quantityInput);
    await user.type(quantityInput, '0');

    // Try to submit
    await user.click(screen.getByText(/Save/));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Quantity must be at least 1/)).toBeInTheDocument();
    });

    // Should NOT call the update function
    expect(mockUpdateBillItems).not.toHaveBeenCalled();
  });

  it('shows validation error for quantity greater than 100', async () => {
    const user = userEvent.setup();
    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/ });
    await user.clear(quantityInput);
    await user.type(quantityInput, '101');

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(screen.getByText(/Quantity cannot exceed 100/)).toBeInTheDocument();
    });
    expect(mockUpdateBillItems).not.toHaveBeenCalled();
  });

  it('shows validation error for non-integer quantity', async () => {
    const user = userEvent.setup();
    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/ });
    await user.clear(quantityInput);
    await user.type(quantityInput, '2.5');

    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(screen.getByText(/Quantity must be a whole number/)).toBeInTheDocument();
    });
    expect(mockUpdateBillItems).not.toHaveBeenCalled();
  });

  it('clears validation error when valid quantity is entered', async () => {
    const user = userEvent.setup();
    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/ });

    // Enter invalid value
    await user.clear(quantityInput);
    await user.type(quantityInput, '0');
    await user.click(screen.getByText(/Save/));

    await waitFor(() => {
      expect(screen.getByText(/Quantity must be at least 1/)).toBeInTheDocument();
    });

    // Fix it
    await user.clear(quantityInput);
    await user.type(quantityInput, '5');

    // Error should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Quantity must be at least 1/)).not.toBeInTheDocument();
    });
  });

  it('allows updating the quantity of a zero-price (free) service while keeping price at zero', async () => {
    const user = userEvent.setup();
    mockUpdateBillItems.mockResolvedValueOnce({} as FetchResponse<any>);

    const freeServiceItem = { ...mockItem, price: 0 };
    const billWithFreeItem: MappedBill = {
      ...mockBill,
      lineItems: [{ ...mockBill.lineItems[0], price: 0 }],
    };

    render(
      <EditBillLineItemModal
        bill={billWithFreeItem}
        item={freeServiceItem}
        closeModal={mockCloseModal}
        onMutate={mockOnMutate}
      />,
    );

    expect(screen.getByLabelText(/unit price/i)).toHaveValue('0');

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '5');

    expect(screen.getByText(/total/i)).toHaveTextContent(/0/);

    await user.click(screen.getByText(/save/i));

    await waitFor(() => {
      expect(mockUpdateBillItems).toHaveBeenCalled();
      const payload = mockUpdateBillItems.mock.calls[0][0];
      const updatedItem = payload.lineItems.find((li) => li.uuid === freeServiceItem.uuid);
      expect(updatedItem?.quantity).toBe(5);
      expect(updatedItem?.price).toBe(0);
      expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
      expect(mockCloseModal).toHaveBeenCalled();
    });
  });

  it('shows validation error when quantity field is left empty', async () => {
    const user = userEvent.setup();
    render(
      <EditBillLineItemModal bill={mockBill} item={mockItem} closeModal={mockCloseModal} onMutate={mockOnMutate} />,
    );

    const quantityInput = screen.getByRole('spinbutton', { name: /Quantity/ });
    await user.clear(quantityInput);

    // Try to submit with empty field
    await user.click(screen.getByText(/save/i));

    // Should show validation error (empty string coerces to 0, triggering min validation)
    await waitFor(() => {
      expect(screen.getByText(/Quantity must be at least 1/)).toBeInTheDocument();
    });

    // Should NOT call the update function
    expect(mockUpdateBillItems).not.toHaveBeenCalled();
  });
});
