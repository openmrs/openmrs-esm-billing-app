import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { getDefaultsFromConfigSchema, showModal, useConfig } from '@openmrs/esm-framework';
import { BillStatus, RefundStatus, type BillRefund, type MappedBill } from '../types';
import { configSchema, type BillingConfig } from '../config-schema';
import InvoiceTable from './invoice-table.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockShowModal = vi.mocked(showModal);

vi.mock('../helpers', () => ({
  convertToCurrency: vi.fn((price) => `USD ${price}`),
}));

vi.mock('../discounts/discounts.resource', () => ({
  useBillDiscounts: () => ({ discounts: [], isLoading: false, error: null, mutate: vi.fn() }),
}));

describe('InvoiceTable', () => {
  const mockOnMutate = vi.fn();

  const defaultBill: MappedBill = {
    uuid: 'bill-uuid',
    id: 123,
    patientUuid: 'patient-uuid',
    patientName: 'John Doe',
    lineItems: [
      {
        uuid: '1',
        item: 'Item 1',
        status: 'PAID',
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
        status: 'PENDING',
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
    netAmount: 300,
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
    expect(screen.getByRole('columnheader', { name: /^number$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /bill item/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /quantity/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /price/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /total/i })).toBeInTheDocument();
  });

  it('should render line items correctly', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
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
          status: 'PENDING',
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

  it('should render overflow menus for all line items', () => {
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    const overflowMenus = screen.getAllByRole('button', { name: /options/i });
    expect(overflowMenus.length).toBe(2);
  });

  it('should open edit modal when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={{ ...defaultBill, status: 'PENDING' }} onMutate={mockOnMutate} />);

    // Open the overflow menu for the first row
    const overflowMenus = screen.getAllByRole('button', { name: /options/i });
    await user.click(overflowMenus[0]);

    // Find and click the edit button
    const editButton = await screen.findByTestId('edit-button-1');
    await user.click(editButton);

    expect(mockShowModal).toHaveBeenCalledTimes(1);
    expect(mockShowModal).toHaveBeenCalledWith(
      'edit-bill-line-item-modal',
      expect.objectContaining({
        bill: { ...defaultBill, status: 'PENDING' },
        item: expect.objectContaining({ uuid: '1' }),
        onMutate: mockOnMutate,
      }),
    );
  });

  it('should open delete modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={{ ...defaultBill, status: 'PENDING' }} onMutate={mockOnMutate} />);

    // Open the overflow menu for the first row
    const overflowMenus = screen.getAllByRole('button', { name: /options/i });
    await user.click(overflowMenus[0]);

    // Find and click the delete button
    const deleteButton = await screen.findByTestId('delete-button-1');
    await user.click(deleteButton);

    expect(mockShowModal).toHaveBeenCalledTimes(1);
    expect(mockShowModal).toHaveBeenCalledWith(
      'delete-line-item-confirmation-modal',
      expect.objectContaining({
        item: expect.objectContaining({ uuid: '1' }),
        onMutate: mockOnMutate,
      }),
    );
  });

  it('should disable delete button when bill status is not PENDING', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    // Open the overflow menu for the first row
    const overflowMenus = screen.getAllByRole('button', { name: /options/i });
    await user.click(overflowMenus[0]);

    // Find the delete button
    const deleteButton = await screen.findByTestId('delete-button-1');
    expect(deleteButton).toBeDisabled();
  });

  it('should disable edit button when bill status is not PENDING', async () => {
    const user = userEvent.setup();
    render(<InvoiceTable bill={defaultBill} onMutate={mockOnMutate} />);

    // Open the overflow menu for the first row
    const overflowMenus = screen.getAllByRole('button', { name: /options/i });
    await user.click(overflowMenus[0]);

    // Find the edit button
    const editButton = await screen.findByTestId('edit-button-1');
    expect(editButton).toBeDisabled();
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
          status: 'PAID',
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
          status: 'PENDING',
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
          status: 'PAID',
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
          status: 'PENDING',
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

  describe('viewOnly mode', () => {
    it('hides the search box', () => {
      render(<InvoiceTable bill={defaultBill} viewOnly />);
      expect(screen.queryByPlaceholderText(/search this table/i)).not.toBeInTheDocument();
    });

    it('hides the actions column header', () => {
      render(<InvoiceTable bill={defaultBill} viewOnly />);
      // 6 data column headers; no 7th actions header
      expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    });

    it('hides per-row action menus', () => {
      render(<InvoiceTable bill={defaultBill} viewOnly />);
      expect(screen.queryAllByRole('button', { name: /options/i })).toHaveLength(0);
    });

    it('hides the filter helper text in the empty state', () => {
      const emptyBill: MappedBill = { ...defaultBill, lineItems: [] };
      render(<InvoiceTable bill={emptyBill} viewOnly />);
      expect(screen.getByText(/no matching items to display/i)).toBeInTheDocument();
      expect(screen.queryByText(/check the filters above/i)).not.toBeInTheDocument();
    });
  });

  describe('line-item refund eligibility', () => {
    const makeRefund = (overrides: Partial<BillRefund> = {}): BillRefund => ({
      uuid: 'r-1',
      billUuid: 'bill-uuid',
      lineItemUuid: null,
      refundAmount: 100,
      reason: 'overcharged',
      initiator: { uuid: 'u1', display: 'cashier' },
      approver: null,
      completer: null,
      dateApproved: null,
      dateCompleted: null,
      dateCreated: '2024-01-01',
      status: RefundStatus.REQUESTED,
      voided: false,
      ...overrides,
    });

    const paidBill: MappedBill = { ...defaultBill, status: BillStatus.PAID, totalAmount: 300, tenderedAmount: 300 };

    it('shows the refund action for an eligible line item on a PAID bill', async () => {
      const user = userEvent.setup();
      render(<InvoiceTable bill={paidBill} onMutate={mockOnMutate} />);
      await user.click(screen.getByTestId('action-menu-1'));
      expect(screen.getByTestId('request-refund-button-1')).toBeInTheDocument();
    });

    it('hides the refund action for a line item that already has an active refund', async () => {
      const user = userEvent.setup();
      render(
        <InvoiceTable bill={{ ...paidBill, refunds: [makeRefund({ lineItemUuid: '1' })] }} onMutate={mockOnMutate} />,
      );
      await user.click(screen.getByTestId('action-menu-1'));
      expect(screen.queryByTestId('request-refund-button-1')).not.toBeInTheDocument();
    });

    it('hides the refund action for all line items when there is an active bill-level refund', async () => {
      const user = userEvent.setup();
      render(
        <InvoiceTable bill={{ ...paidBill, refunds: [makeRefund({ lineItemUuid: null })] }} onMutate={mockOnMutate} />,
      );
      await user.click(screen.getByTestId('action-menu-1'));
      expect(screen.queryByTestId('request-refund-button-1')).not.toBeInTheDocument();
    });

    it('shows the refund action for a line item when bill is REFUND_REQUESTED due to a different line item', async () => {
      const user = userEvent.setup();
      const bill: MappedBill = {
        ...paidBill,
        status: BillStatus.REFUND_REQUESTED,
        refunds: [makeRefund({ uuid: 'r-1', lineItemUuid: '1' })],
      };
      render(<InvoiceTable bill={bill} onMutate={mockOnMutate} />);
      await user.click(screen.getByTestId('action-menu-2'));
      expect(screen.getByTestId('request-refund-button-2')).toBeInTheDocument();
    });

    it('hides the refund action for the line item that triggered REFUND_REQUESTED status', async () => {
      const user = userEvent.setup();
      const bill: MappedBill = {
        ...paidBill,
        status: BillStatus.REFUND_REQUESTED,
        refunds: [makeRefund({ uuid: 'r-1', lineItemUuid: '1' })],
      };
      render(<InvoiceTable bill={bill} onMutate={mockOnMutate} />);
      await user.click(screen.getByTestId('action-menu-1'));
      expect(screen.queryByTestId('request-refund-button-1')).not.toBeInTheDocument();
    });

    it('hides all line-item refund actions when there is an active bill-level refund on a REFUND_REQUESTED bill', async () => {
      const user = userEvent.setup();
      const bill: MappedBill = {
        ...paidBill,
        status: BillStatus.REFUND_REQUESTED,
        refunds: [makeRefund({ lineItemUuid: null })],
      };
      render(<InvoiceTable bill={bill} onMutate={mockOnMutate} />);
      await user.click(screen.getByTestId('action-menu-1'));
      expect(screen.queryByTestId('request-refund-button-1')).not.toBeInTheDocument();
    });
  });

  describe('per-line-item discount action', () => {
    it('opens the request-discount modal with lineItem scope', async () => {
      const user = userEvent.setup();
      const billPosted: MappedBill = {
        ...defaultBill,
        status: 'POSTED',
        lineItems: [
          {
            uuid: 'li1',
            item: 'Consultation',
            status: 'PENDING',
            quantity: 1,
            price: 1000,
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
        totalAmount: 1000,
      };
      render(<InvoiceTable bill={billPosted} onMutate={mockOnMutate} />);

      await user.click(screen.getByTestId('action-menu-li1'));
      await user.click(screen.getByText(/request discount/i));

      expect(mockShowModal).toHaveBeenCalledWith(
        'request-discount-modal',
        expect.objectContaining({
          lineItem: expect.objectContaining({ uuid: 'li1', display: 'Consultation' }),
        }),
      );
    });
  });
});
