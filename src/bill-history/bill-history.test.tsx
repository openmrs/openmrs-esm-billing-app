import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { useBills } from '../billing.resource';
import BillHistory from './bill-history.component';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock window.i18next
window.i18next = {
  language: 'en-US',
} as any;

const testProps = {
  patientUuid: 'some-uuid',
};

const mockbills = useBills as any;

const mockBillsData = [
  { uuid: '1', patientName: 'John Doe', identifier: '12345678', billingService: 'Checkup', totalAmount: 500 },
  { uuid: '2', patientName: 'John Doe', identifier: '12345678', billingService: 'Consulatation', totalAmount: 600 },
  { uuid: '3', patientName: 'John Doe', identifier: '12345678', billingService: 'Child services', totalAmount: 700 },
  { uuid: '4', patientName: 'John Doe', identifier: '12345678', billingService: 'Medication', totalAmount: 800 },
  { uuid: '5', patientName: 'John Doe', identifier: '12345678', billingService: 'Lab', totalAmount: 900 },
  { uuid: '6', patientName: 'John Doe', identifier: '12345678', billingService: 'Pharmacy', totalAmount: 400 },
  { uuid: '7', patientName: 'John Doe', identifier: '12345678', billingService: 'Nutrition', totalAmount: 300 },
  { uuid: '8', patientName: 'John Doe', identifier: '12345678', billingService: 'Physiotherapy', totalAmount: 200 },
  { uuid: '9', patientName: 'John Doe', identifier: '12345678', billingService: 'Dentist', totalAmount: 1100 },
  { uuid: '10', patientName: 'John Doe', identifier: '12345678', billingService: 'Neuro', totalAmount: 1200 },
  { uuid: '11', patientName: 'John Doe', identifier: '12345678', billingService: 'Outpatient', totalAmount: 1050 },
  { uuid: '12', patientName: 'John Doe', identifier: '12345678', billingService: 'MCH', totalAmount: 1300 },
];

// Mock the invoice table component
vi.mock('../invoice/invoice-table.component', () => ({
  default: () => <div>Invoice table</div>,
}));

// Mock the billing resource
vi.mock('../billing.resource', () => ({
  useBills: vi.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
  })),
}));

// Mock esm-framework
vi.mock('@openmrs/esm-framework', () => ({
  useLayoutType: vi.fn(() => 'small-desktop'),
  isDesktop: vi.fn(() => true),
  usePagination: vi.fn().mockImplementation((data) => ({
    currentPage: 1,
    goTo: vi.fn(),
    results: data,
    paginated: true,
  })),
  showToast: vi.fn(),
  showNotification: vi.fn(),
  createErrorHandler: vi.fn(),
  createGlobalStore: vi.fn(),
  getGlobalStore: vi.fn(() => ({
    subscribe: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
  })),
  useConfig: vi.fn(() => ({
    pageSize: 10,
    defaultCurrency: 'USD',
  })),
  useSession: vi.fn(() => ({
    sessionLocation: { uuid: 'some-uuid', display: 'Location' },
  })),
  formatDate: vi.fn((date) => date?.toString() ?? ''),
  formatDatetime: vi.fn((date) => date?.toString() ?? ''),
  parseDate: vi.fn((dateString) => new Date(dateString)),
  ExtensionSlot: vi.fn(({ children }) => <>{children}</>),
  CardHeader: vi.fn(({ children }) => <div>{children}</div>),
  EmptyCardIllustration: vi.fn(() => <div>Empty state illustration</div>),
  ErrorState: vi.fn(({ error }) => <div>Error: {error?.message}</div>),
  launchPatientWorkspace: vi.fn(),
  usePaginationInfo: vi.fn(() => ({
    pageSizes: [10, 20, 30],
    currentPage: 1,
  })),
  getCoreTranslation: vi.fn((key) => key),
  restBaseUrl: 'http://localhost',
}));

describe('BillHistory', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should render loading datatable skeleton', () => {
    mockbills.mockReturnValueOnce({
      isLoading: true,
      isValidating: false,
      error: null,
      bills: [],
      dateFilteredBills: [],
      mutate: vi.fn(),
    });
    render(<BillHistory {...testProps} />);
    const loadingSkeleton = screen.getByRole('table');
    expect(loadingSkeleton).toBeInTheDocument();
    expect(loadingSkeleton).toHaveClass('cds--skeleton cds--data-table cds--data-table--zebra');
  });

  test('should render error state when API call fails', () => {
    mockbills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: new Error('some error'),
      bills: [],
      dateFilteredBills: [],
      mutate: vi.fn(),
    });
    render(<BillHistory {...testProps} />);
    const errorState = screen.getByText('Error: some error');
    expect(errorState).toBeInTheDocument();
  });

  test.skip('should render bills table', async () => {
    const user = userEvent.setup();
    mockbills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: null,
      bills: mockBillsData as any,
      dateFilteredBills: mockBillsData as any,
      mutate: vi.fn(),
    });
    render(<BillHistory {...testProps} />);

    // Verify headers
    expect(screen.getByText('visitTime')).toBeInTheDocument();
    expect(screen.getByText('identifier')).toBeInTheDocument();

    const tableRowGroup = screen.getAllByRole('rowgroup');
    expect(tableRowGroup).toHaveLength(2);

    // Page navigation should work as expected
    const nextPageButton = screen.getByRole('button', { name: /nextPage/ });
    const prevPageButton = screen.getByRole('button', { name: /previousPage/ });

    expect(nextPageButton).toBeInTheDocument();
    expect(prevPageButton).toBeInTheDocument();

    // Check pagination text (using translation keys since we mocked the translator)
    await user.click(nextPageButton);
    await user.click(prevPageButton);

    // clicking the row should expand the row
    const expandAllRowButton = screen.getByRole('button', { name: /Expand all rows/ });
    expect(expandAllRowButton).toBeInTheDocument();
    await user.click(expandAllRowButton);
  });

  test.skip('should render empty state view when there are no bills', () => {
    mockbills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: null,
      bills: [],
      dateFilteredBills: [],
      mutate: vi.fn(),
    });
    render(<BillHistory {...testProps} />);
    const emptyState = screen.getByText(/There are no bills to display./);
    expect(emptyState).toBeInTheDocument();
  });
});
