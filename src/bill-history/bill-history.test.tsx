import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useBills } from '../billing.resource';
import BillHistory from './bill-history.component';

// Mock i18next
jest.mock('react-i18next', () => ({
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

const mockbills = useBills as jest.MockedFunction<typeof useBills>;

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
jest.mock('../invoice/invoice-table.component', () => jest.fn(() => <div>Invoice table</div>));

// Mock the billing resource
jest.mock('../billing.resource', () => ({
  useBills: jest.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
  })),
}));

// Mock esm-patient-common-lib
jest.mock('@openmrs/esm-patient-common-lib', () => ({
  CardHeader: jest.fn(({ children }) => <div>{children}</div>),
  EmptyDataIllustration: jest.fn(() => <div>Empty state illustration</div>),
  ErrorState: jest.fn(({ error }) => <div>Error: {error?.message}</div>),
  launchPatientWorkspace: jest.fn(),
  usePaginationInfo: jest.fn(() => ({
    pageSizes: [10, 20, 30],
    currentPage: 1,
  })),
}));

// Mock esm-framework
jest.mock('@openmrs/esm-framework', () => ({
  useLayoutType: jest.fn(() => 'small-desktop'),
  isDesktop: jest.fn(() => true),
  usePagination: jest.fn().mockImplementation((data) => ({
    currentPage: 1,
    goTo: jest.fn(),
    results: data,
    paginated: true,
  })),
  showToast: jest.fn(),
  showNotification: jest.fn(),
  createErrorHandler: jest.fn(),
  createGlobalStore: jest.fn(),
  getGlobalStore: jest.fn(() => ({
    subscribe: jest.fn(),
    getState: jest.fn(),
    setState: jest.fn(),
  })),
  useConfig: jest.fn(() => ({
    pageSize: 10,
    defaultCurrency: 'USD',
  })),
  useSession: jest.fn(() => ({
    sessionLocation: { uuid: 'some-uuid', display: 'Location' },
  })),
  formatDate: jest.fn((date) => date?.toString() ?? ''),
  formatDatetime: jest.fn((date) => date?.toString() ?? ''),
  parseDate: jest.fn((dateString) => new Date(dateString)),
  ExtensionSlot: jest.fn(({ children }) => <>{children}</>),
}));

describe('BillHistory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render loading datatable skeleton', () => {
    mockbills.mockReturnValueOnce({ isLoading: true, isValidating: false, error: null, bills: [], mutate: jest.fn() });
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
      mutate: jest.fn(),
    });
    render(<BillHistory {...testProps} />);
    const errorState = screen.getByText('Error: some error');
    expect(errorState).toBeInTheDocument();
  });

  test('should render bills table', async () => {
    const user = userEvent.setup();
    mockbills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: null,
      bills: mockBillsData as any,
      mutate: jest.fn(),
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

  test('should render empty state view when there are no bills', () => {
    mockbills.mockReturnValueOnce({ isLoading: false, isValidating: false, error: null, bills: [], mutate: jest.fn() });
    render(<BillHistory {...testProps} />);
    const emptyState = screen.getByText(/There are no bills to display./);
    expect(emptyState).toBeInTheDocument();
  });
});
