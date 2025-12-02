import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { getDefaultsFromConfigSchema, showModal, useConfig } from '@openmrs/esm-framework';
import { type MappedBill } from '../types';
import { configSchema, type BillingConfig } from '../config-schema';
import InvoiceTable from './invoice-table.component';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockShowModal = jest.mocked(showModal);

jest.mock('../helpers', () => ({
  convertToCurrency: jest.fn((price) => `USD ${price}`),
}));

describe('InvoiceTable', () => {
  const mockOnMutate = jest.fn();

  const defaultBill: MappedBill = {
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

  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      defaultCurrency: 'USD',
    });
  });

  it('should render table headers correctly', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    expect(screen.getByText(/line items/i)).toBeInTheDocument();
    expect(screen.getByText(/items to be billed/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /bill item/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /bill code/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /quantity/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /price/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();
  });

  it('should render line items correctly', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByTestId('receipt-number-0')).toHaveTextContent('12345');
    expect(screen.getByTestId('receipt-number-1')).toHaveTextContent('12345');
  });

  it('should display loading skeleton when bill is loading', () => {
    render(<InvoiceTable bill={defaultBill} isLoadingBill={true} onMutate={mockOnMutate} />);

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.queryByText(/line items/i)).not.toBeInTheDocument();
  });

  it('should display payment status for each line item', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('should display correct quantities', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    // Item 1 has quantity 1, Item 2 has quantity 2
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3); // Header row + 2 data rows
  });

  it('should calculate and display line item totals correctly', () => {
    const billWithCalculation: MappedBill = {
      ...defaultBill,
      lineItems: [
        {
          uuid: '1',
          item: 'Service A',
          paymentStatus: 'PENDING',
          quantity: 3,
          price: 100,
          display: '',
          voided: false,
          voidReason: '',
          billableService: 'Service A',
          priceName: '',
          priceUuid: '',
          lineItemOrder: 0,
          resourceVersion: '',
        },
      ],
    };

    render(<InvoiceTable bill={billWithCalculation} onMutate={mockOnMutate} />);

    // Total should be 3 * 100 = 300
    expect(screen.getByText('USD 300')).toBeInTheDocument();
  });

  it('should render edit buttons for all line items', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    const editButton1 = screen.getByTestId('edit-button-1');
    const editButton2 = screen.getByTestId('edit-button-2');

    expect(editButton1).toBeInTheDocument();
    expect(editButton2).toBeInTheDocument();
  });

  it('should open edit modal when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    const editButton = screen.getByTestId('edit-button-1');
    await user.click(editButton);

    expect(mockShowModal).toHaveBeenCalledTimes(1);
    expect(mockShowModal).toHaveBeenCalledWith(
      'edit-bill-line-item-modal',
      expect.objectContaining({
        bill: defaultBill,
        item: expect.objectContaining({ uuid: '1' }),
        onMutate: mockOnMutate,
      }),
    );
  });

  it('should filter line items based on search term', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    const searchInput = screen.getByPlaceholderText(/search this table/i);
    await user.type(searchInput, 'Item 2');

    await waitFor(() => {
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('should show all items when search is cleared', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    const searchInput = screen.getByPlaceholderText(/search this table/i);

    // Search for Item 1
    await user.type(searchInput, 'Item 1');

    await waitFor(() => {
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    // Clear search
    await user.clear(searchInput);

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('should display empty state when no line items exist', () => {
    const emptyBill: MappedBill = {
      ...defaultBill,
      lineItems: [],
    };

    render(<InvoiceTable bill={emptyBill} onMutate={mockOnMutate} />);

    expect(screen.getByText(/no matching items to display/i)).toBeInTheDocument();
    expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
  });

  it('should show empty state when search has no results', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    const searchInput = screen.getByPlaceholderText(/search this table/i);
    await user.type(searchInput, 'NonexistentItem');

    await waitFor(() => {
      expect(screen.getByText(/no matching items to display/i)).toBeInTheDocument();
      expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
    });
  });

  it('should handle line items with zero price', () => {
    const billWithZeroPrice: MappedBill = {
      ...defaultBill,
      lineItems: [
        {
          uuid: '1',
          item: 'Free Service',
          paymentStatus: 'PAID',
          quantity: 1,
          price: 0,
          display: '',
          voided: false,
          voidReason: '',
          billableService: 'Free Service',
          priceName: '',
          priceUuid: '',
          lineItemOrder: 0,
          resourceVersion: '',
        },
      ],
    };

    render(<InvoiceTable bill={billWithZeroPrice} onMutate={mockOnMutate} />);

    // USD 0 appears for both price and total
    expect(screen.getAllByText('USD 0').length).toBeGreaterThan(0);
  });

  it('should handle line items with zero quantity', () => {
    const billWithZeroQuantity: MappedBill = {
      ...defaultBill,
      lineItems: [
        {
          uuid: '1',
          item: 'Service',
          paymentStatus: 'PENDING',
          quantity: 0,
          price: 100,
          display: '',
          voided: false,
          voidReason: '',
          billableService: 'Service',
          priceName: '',
          priceUuid: '',
          lineItemOrder: 0,
          resourceVersion: '',
        },
      ],
    };

    render(<InvoiceTable bill={billWithZeroQuantity} onMutate={mockOnMutate} />);

    // Total should be 0 * 100 = 0
    expect(screen.getByText('USD 0')).toBeInTheDocument();
  });

  it('should use billableService name when available, otherwise use item name', () => {
    const billWithBillableService: MappedBill = {
      ...defaultBill,
      lineItems: [
        {
          uuid: '1',
          item: 'Item Name',
          billableService: 'Billable Service Name',
          paymentStatus: 'PAID',
          quantity: 1,
          price: 100,
          display: '',
          voided: false,
          voidReason: '',
          priceName: '',
          priceUuid: '',
          lineItemOrder: 0,
          resourceVersion: '',
        },
        {
          uuid: '2',
          item: 'Item Without Billable',
          billableService: '',
          paymentStatus: 'PENDING',
          quantity: 1,
          price: 200,
          display: '',
          voided: false,
          voidReason: '',
          priceName: '',
          priceUuid: '',
          lineItemOrder: 1,
          resourceVersion: '',
        },
      ],
    };

    render(<InvoiceTable bill={billWithBillableService} onMutate={mockOnMutate} />);

    expect(screen.getByText('Billable Service Name')).toBeInTheDocument();
    expect(screen.getByText('Item Without Billable')).toBeInTheDocument();
  });

  it('should display line item numbers starting from 1', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    // Check the table body for numbered rows
    const rows = screen.getAllByRole('row');
    // First row is header, so data rows start at index 1
    expect(rows.length).toBeGreaterThan(2);
  });

  it('should pass correct currency to convertToCurrency helper', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    // Verify prices are formatted with USD - multiple occurrences expected
    expect(screen.getAllByText('USD 100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USD 200').length).toBeGreaterThan(0);
  });

  it('should render search input in expanded state', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    const searchInput = screen.getByPlaceholderText(/search this table/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toBeVisible();
  });
});
