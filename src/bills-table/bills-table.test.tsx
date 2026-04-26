import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { usePaginatedBills } from '../billing.resource';
import { BillStatus } from '../types';
import BillsTable from './bills-table.component';

vi.mock('../billing.resource', () => ({
  usePaginatedBills: vi.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
    mutate: vi.fn(),
  })),
}));

const mockBills = vi.mocked(usePaginatedBills);

const mockBillsData = [
  {
    uuid: '1',
    id: 1,
    patientName: 'John Doe',
    identifier: '12345678',
    visitType: 'Checkup',
    patientUuid: 'uuid1',
    dateCreated: '2024-01-01',
    lineItems: [
      {
        uuid: 'line-item-1',
        display: 'Service 1 Line Item',
        voided: false,
        voidReason: null,
        item: 'Service 1',
        billableService: 'Service 1',
        quantity: 1,
        price: 100,
        priceName: 'Standard Price',
        priceUuid: 'price-1',
        lineItemOrder: 1,
        resourceVersion: '1.0',
        paymentStatus: 'PENDING',
      },
    ],
    status: BillStatus.PENDING,
    cashPointUuid: 'cash-point-1',
    cashPointName: 'Main Cash Point',
    cashPointLocation: 'Main Hospital',
    cashier: { uuid: 'cashier-1', display: 'Jane Cashier', links: [] },
    receiptNumber: 'RCP-001',
    billingService: 'Service 1',
    payments: [],
    totalAmount: 100,
    tenderedAmount: 0,
  },
  {
    uuid: '2',
    id: 2,
    patientName: 'Mary Smith',
    identifier: '98765432',
    visitType: 'Wake up',
    patientUuid: 'uuid2',
    dateCreated: '2024-01-02',
    lineItems: [
      {
        uuid: 'line-item-2',
        display: 'Service 2 Line Item',
        voided: false,
        voidReason: null,
        item: 'Service 2',
        billableService: 'Service 2',
        quantity: 1,
        price: 200,
        priceName: 'Standard Price',
        priceUuid: 'price-1',
        lineItemOrder: 1,
        resourceVersion: '1.0',
        paymentStatus: 'PENDING',
      },
    ],
    status: BillStatus.PENDING,
    cashPointUuid: 'cash-point-1',
    cashPointName: 'Main Cash Point',
    cashPointLocation: 'Main Hospital',
    cashier: { uuid: 'cashier-1', display: 'Jane Cashier', links: [] },
    receiptNumber: 'RCP-002',
    billingService: 'Service 2',
    payments: [],
    totalAmount: 200,
    tenderedAmount: 200,
  },
];

describe('BillsTable', () => {
  beforeEach(() => {
    mockBills.mockImplementation(() => ({
      bills: mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 10,
      goTo: vi.fn(),
    }));
  });

  it('renders data table with pending bills', () => {
    render(<BillsTable />);

    expect(screen.getByText(/bill date/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice number/i)).toBeInTheDocument();
    expect(screen.getByText(/patient identifier/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/12345678/i)).toBeInTheDocument();
  });

  it('displays empty state when there are no bills with default filter', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: vi.fn(),
    }));

    render(<BillsTable />);

    // With default "Pending bills" filter, shows "No matching bills" not empty state
    expect(screen.getByText(/no matching bills to display/i)).toBeInTheDocument();
    expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('should show the loading spinner while retrieving data', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: true,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: vi.fn(),
    }));

    render(<BillsTable />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/filter by/i)).toBeInTheDocument();
    expect(screen.getByText(/pending payment/i)).toBeInTheDocument();
  });

  it('should display an error state if there is a problem loading bill data', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: false,
      isValidating: false,
      error: new Error('Error in fetching data'),
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: vi.fn(),
    }));

    render(<BillsTable />);

    expect(screen.getByText(/error state/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/filter by/i)).toBeInTheDocument();
    expect(screen.getByText(/pending payment/i)).toBeInTheDocument();
  });

  it('should pass search term to backend API', async () => {
    const user = userEvent.setup();
    const mockGoTo = vi.fn();

    mockBills.mockImplementation((_pageSize, _status, patientName) => ({
      bills: patientName === 'John' ? [mockBillsData[0]] : mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: patientName === 'John' ? 1 : 2,
      goTo: mockGoTo,
    }));

    render(<BillsTable />);

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Mary Smith')).toBeInTheDocument();

    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(mockBills).toHaveBeenCalledWith(10, 'POSTED', 'John');
    });

    expect(mockGoTo).toHaveBeenCalledWith(1);
  });

  it('should render invoice number as a link to the invoice page', () => {
    render(<BillsTable />);

    const invoiceNumberLink = screen.getByRole('link', { name: 'RCP-001' });
    expect(invoiceNumberLink).toBeInTheDocument();

    expect(invoiceNumberLink).toHaveAttribute('href', '/openmrs/spa/home/billing/patient/uuid1/1');
  });

  it('should filter bills by payment status', async () => {
    const user = userEvent.setup();

    // First call: initial render with PENDING filter (default)
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData.map((bill) => ({ ...bill, status: BillStatus.PENDING })),
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 2,
      goTo: vi.fn(),
    }));

    // Second call: after filter changes to PAID, return empty bills
    mockBills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: vi.fn(),
    }));

    render(<BillsTable />);

    const filterDropdown = screen.getByText('Pending payment');
    await user.click(filterDropdown);

    const paidBillsOption = screen.getAllByText('Paid bills')[0];
    await user.click(paidBillsOption);

    // With "Paid bills" filter active and no results, shows "No matching bills"
    await waitFor(() => {
      expect(screen.getByText(/no matching bills to display/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
  });

  it('should show loading state during background updates', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData,
      isLoading: false,
      isValidating: true,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: vi.fn(),
    }));

    render(<BillsTable />);

    const loadingIndicator = screen.getByTitle('loading');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('should show search box and empty state message when search returns no results', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: vi.fn(),
    }));

    render(<BillsTable />);

    // With active filters, shows search box even with no results
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText(/no matching bills to display/i)).toBeInTheDocument();
    expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
    expect(screen.queryByText(/next page/i)).not.toBeInTheDocument();
  });

  it('should reset to page 1 when page size changes', async () => {
    const user = userEvent.setup();
    const mockGoTo = vi.fn();

    mockBills.mockImplementation(() => ({
      bills: mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 3,
      totalCount: 100,
      goTo: mockGoTo,
    }));

    render(<BillsTable />);

    const pageSizeSelector = screen.getByRole('combobox', { name: /items per page/i });
    expect(pageSizeSelector).toBeInTheDocument();

    // Change the page size to 20
    await user.selectOptions(pageSizeSelector, '20');

    // Should call goTo(1) to reset to first page
    await waitFor(() => {
      expect(mockGoTo).toHaveBeenCalledWith(1);
    });
  });

  it('should default to "Pending payment" filter showing POSTED bills', () => {
    render(<BillsTable />);

    expect(screen.getByText('Pending payment')).toBeInTheDocument();
    expect(mockBills).toHaveBeenCalledWith(expect.any(Number), 'POSTED', undefined);
  });

  it('should show "Pending confirmation" option in filter dropdown', async () => {
    const user = userEvent.setup();
    render(<BillsTable />);

    const filterDropdown = screen.getByText('Pending payment');
    await user.click(filterDropdown);

    expect(screen.getByRole('option', { name: /pending confirmation/i })).toBeInTheDocument();
  });

  it('should filter by PENDING status when "Pending confirmation" is selected', async () => {
    const user = userEvent.setup();
    const mockGoTo = vi.fn();

    mockBills.mockImplementation((_pageSize, status) => ({
      bills: status === 'PENDING' ? [mockBillsData[0]] : mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: status === 'PENDING' ? 1 : 2,
      goTo: mockGoTo,
    }));

    render(<BillsTable />);

    const filterDropdown = screen.getByText('Pending payment');
    await user.click(filterDropdown);

    await user.click(screen.getByRole('option', { name: /pending confirmation/i }));

    await waitFor(() => {
      expect(mockBills).toHaveBeenCalledWith(expect.any(Number), 'PENDING', undefined);
    });
  });

  it('should filter by POSTED status when "Pending payment" is selected', async () => {
    const user = userEvent.setup();
    const mockGoTo = vi.fn();

    mockBills.mockImplementation((_pageSize, status) => ({
      bills: status === 'POSTED' ? [mockBillsData[1]] : mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
      currentPage: 1,
      totalCount: 1,
      goTo: mockGoTo,
    }));

    render(<BillsTable />);

    // Navigate away from the default POSTED filter first, then select it again
    const filterDropdown = screen.getByText('Pending payment');
    await user.click(filterDropdown);
    await user.click(screen.getByRole('option', { name: /all bills/i }));

    mockBills.mockClear();

    await user.click(screen.getByText('All bills'));
    await user.click(screen.getByRole('option', { name: /pending payment/i }));

    await waitFor(() => {
      expect(mockBills).toHaveBeenCalledWith(expect.any(Number), 'POSTED', undefined);
    });
  });

  it('should keep data visible during subsequent loads', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData,
      isLoading: true,
      isValidating: true,
      error: null,
      mutate: vi.fn(),
      currentPage: 2,
      totalCount: 50,
      goTo: vi.fn(),
    }));

    render(<BillsTable />);

    // Should show data (not skeleton) since bills exist
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Mary Smith')).toBeInTheDocument();

    // Should show background loading indicator
    expect(screen.getByTitle('loading')).toBeInTheDocument();

    // Should NOT show skeleton
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
