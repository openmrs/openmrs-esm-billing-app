import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';
import { getDefaultsFromConfigSchema, showModal, useConfig } from '@openmrs/esm-framework';
import { type MappedBill } from '../types';
import { configSchema, type BillingConfig } from '../config-schema';
import InvoiceTable from './invoice-table.component';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);

jest.mock('../helpers', () => ({
  convertToCurrency: jest.fn((price) => `USD ${price}`),
}));

describe('InvoiceTable', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      defaultCurrency: 'USD',
      showEditBillButton: true,
    });
  });

  const bill: MappedBill = {
    uuid: 'bill-uuid',
    id: 123,
    patientUuid: 'patient-uuid',
    patientName: 'John Doe',
    lineItems: [
      {
        uuid: '1',
        item: 'Item 1',
        paymentStatus: 'PAID',
        quantity: 1,
        price: 100,
        display: '',
        voided: false,
        voidReason: '',
        billableService: '',
        priceName: '',
        priceUuid: '',
        lineItemOrder: 0,
        resourceVersion: '',
      },
      {
        uuid: '2',
        item: 'Item 2',
        paymentStatus: 'PENDING',
        quantity: 2,
        price: 200,
        display: '',
        voided: false,
        voidReason: '',
        billableService: '',
        priceName: '',
        priceUuid: '',
        lineItemOrder: 0,
        resourceVersion: '',
      },
    ],
    receiptNumber: '12345',
    cashPointUuid: 'cash-point-uuid',
    cashPointName: 'Main Cash Point',
    cashPointLocation: 'Front Desk',
    cashier: {
      uuid: 'cashier-uuid',
      display: 'John Doe',
      links: [],
    },
    status: 'PAID',
    identifier: 'receipt-identifier',
    dateCreated: new Date().toISOString(),
    billingService: 'billing-service-uuid',
    payments: [],
    totalAmount: 300,
    tenderedAmount: 300,
  };

  it('renders the table and displays line items correctly', () => {
    render(<InvoiceTable bill={bill} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByTestId('receipt-number-0')).toHaveTextContent('12345');
  });

  it('renders the edit button and calls showModal when clicked', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={bill} />);

    const editButton = screen.getByTestId('edit-button-1');
    await user.click(editButton);
    expect(showModal).toHaveBeenCalledWith('edit-bill-line-item-dialog', expect.anything());
  });

  it('displays a skeleton loader when the bill is loading', () => {
    render(<InvoiceTable bill={bill} isLoadingBill={true} />);

    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('filters line items based on the search term', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={bill} />);
    const searchInput = screen.getByPlaceholderText(/search this table/i);

    await user.type(searchInput, 'Item 2');

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('resets isRedirecting to false after timeout', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={bill} />);

    const button = screen.getByTestId('edit-button-1');
    await user.click(button);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(button).not.toBeDisabled();
  });
});
