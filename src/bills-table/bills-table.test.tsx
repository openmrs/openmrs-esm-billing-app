import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { usePaginatedBills } from '../billing.resource';
import BillsTable from './bills-table.component';
import type { BillStatus } from '../types';

jest.mock('../billing.resource', () => ({
  usePaginatedBills: jest.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
    mutate: jest.fn(),
  })),
}));

const mockBills = jest.mocked(usePaginatedBills);

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
    status: 'PENDING' as BillStatus,
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
    status: 'PENDING' as BillStatus,
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
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 10,
      goTo: jest.fn(),
    }));
  });

  test('renders data table with pending bills', () => {
    render(<BillsTable />);

    expect(screen.getByText(/visit time/i)).toBeInTheDocument();
    expect(screen.getByText(/patient identifier/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/12345678/i)).toBeInTheDocument();
  });

  test('displays empty state when there are no bills with default filter', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: jest.fn(),
    }));

    render(<BillsTable />);

    // With default "Pending bills" filter, shows "No matching bills" not empty state
    expect(screen.getByText(/no matching bills to display/i)).toBeInTheDocument();
    expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  test('should show the loading spinner while retrieving data', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: true,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: jest.fn(),
    }));

    render(<BillsTable />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/filter by/i)).toBeInTheDocument();
    expect(screen.getByText(/pending bills/i)).toBeInTheDocument();
  });

  test('should display an error state if there is a problem loading bill data', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: false,
      isValidating: false,
      error: new Error('Error in fetching data'),
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: jest.fn(),
    }));

    render(<BillsTable />);

    expect(screen.getByText(/error state/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/filter by/i)).toBeInTheDocument();
    expect(screen.getByText(/pending bills/i)).toBeInTheDocument();
  });

  test('should pass search term to backend API', async () => {
    const user = userEvent.setup();
    const mockGoTo = jest.fn();

    mockBills.mockImplementation((_pageSize, _status, patientName) => ({
      bills: patientName === 'John' ? [mockBillsData[0]] : mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
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
      expect(mockBills).toHaveBeenCalledWith(10, 'PENDING,POSTED', 'John');
    });

    expect(mockGoTo).toHaveBeenCalledWith(1);
  });

  test('should render patient name as a link', () => {
    render(<BillsTable />);

    const patientNameLink = screen.getByRole('link', { name: 'John Doe' });
    expect(patientNameLink).toBeInTheDocument();

    expect(patientNameLink).toHaveAttribute('href', '/openmrs/spa/home/billing/patient/uuid1/1');
  });

  test('should filter bills by payment status', async () => {
    const user = userEvent.setup();

    // First call: initial render with PENDING filter (default)
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData.map((bill) => ({ ...bill, status: 'PENDING' })),
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 2,
      goTo: jest.fn(),
    }));

    // Second call: after filter changes to PAID, return empty bills
    mockBills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: jest.fn(),
    }));

    render(<BillsTable />);

    const filterDropdown = screen.getByText('Pending bills');
    await user.click(filterDropdown);

    const paidBillsOption = screen.getAllByText('Paid bills')[0];
    await user.click(paidBillsOption);

    // With "Paid bills" filter active and no results, shows "No matching bills"
    await waitFor(() => {
      expect(screen.getByText(/no matching bills to display/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
  });

  test('should show loading state during background updates', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData,
      isLoading: false,
      isValidating: true,
      error: null,
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: jest.fn(),
    }));

    render(<BillsTable />);

    const loadingIndicator = screen.getByTitle('loading');
    expect(loadingIndicator).toBeInTheDocument();
  });

  test('should show search box and empty state message when search returns no results', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
      currentPage: 1,
      totalCount: 0,
      goTo: jest.fn(),
    }));

    render(<BillsTable />);

    // With active filters, shows search box even with no results
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText(/no matching bills to display/i)).toBeInTheDocument();
    expect(screen.getByText(/check the filters above/i)).toBeInTheDocument();
    expect(screen.queryByText(/next page/i)).not.toBeInTheDocument();
  });

  test('should reset to page 1 when page size changes', async () => {
    const user = userEvent.setup();
    const mockGoTo = jest.fn();

    mockBills.mockImplementation(() => ({
      bills: mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
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

  test('should keep data visible during subsequent loads', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData,
      isLoading: true,
      isValidating: true,
      error: null,
      mutate: jest.fn(),
      currentPage: 2,
      totalCount: 50,
      goTo: jest.fn(),
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
