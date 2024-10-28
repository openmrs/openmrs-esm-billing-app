import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { useBills } from '../billing.resource';
import BillsTable from './bills-table.component';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockBillsData = [
  {
    uuid: '1',
    patientName: 'John Doe',
    identifier: '12345678',
    visitType: 'Checkup',
    patientUuid: 'uuid1',
    dateCreated: '2024-01-01',
    lineItems: [{ billableService: 'Service 1' }],
    status: 'PENDING',
  },
  {
    uuid: '2',
    patientName: 'Mary Smith',
    identifier: '98765432',
    visitType: 'Wake up',
    patientUuid: 'uuid2',
    dateCreated: '2024-01-02',
    lineItems: [{ billableService: 'Service 2' }],
    status: 'PENDING',
  },
];

jest.mock('../billing.resource', () => ({
  useBills: jest.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
  })),
}));

jest.mock('@openmrs/esm-patient-common-lib', () => ({
  EmptyDataIllustration: jest.fn(() => <div>Empty state illustration</div>),
}));

jest.mock('@openmrs/esm-framework', () => ({
  useLayoutType: jest.fn(() => 'desktop'),
  isDesktop: jest.fn(() => true),
  ErrorState: jest.fn(({ error }) => <div data-testid="error-state">{error?.message || error}</div>),
  useConfig: jest.fn(() => ({
    bills: {
      pageSizes: [10, 20, 30, 40, 50],
      pageSize: 10,
    },
  })),
  usePagination: jest.fn().mockImplementation((data) => ({
    currentPage: 1,
    goTo: jest.fn(),
    results: data,
    paginated: true,
  })),
  ConfigurableLink: jest.fn(({ children, to, templateParams }) => {
    const resolvedTo = '/home/billing/patient/' + templateParams.patientUuid + '/' + templateParams.uuid;
    return <a href={resolvedTo}>{children}</a>;
  }),
  openmrsSpaBase: '',
}));

describe('BillsTable', () => {
  const mockBills = useBills as jest.Mock;
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockBills.mockImplementation(() => ({
      bills: mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
    }));
  });

  test('renders data table with pending bills', () => {
    render(<BillsTable />);

    expect(screen.getByText('visitTime')).toBeInTheDocument();
    expect(screen.getByText('identifier')).toBeInTheDocument();

    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
  });

  test('displays empty state when there are no bills', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);
    expect(screen.getByText('There are no bills to display.')).toBeInTheDocument();
  });

  test('should show the loading spinner while retrieving data', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: true,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);
    const dataTableSkeleton = screen.getByRole('table');
    expect(dataTableSkeleton).toBeInTheDocument();
    expect(dataTableSkeleton).toHaveClass('cds--skeleton cds--data-table cds--data-table--zebra');
  });

  test('should display the error state when there is error', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: false,
      isValidating: false,
      error: new Error('Error in fetching data'),
    }));

    render(<BillsTable />);
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('should filter bills by search term', async () => {
    render(<BillsTable />);

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Mary Smith')).toBeInTheDocument();

    await user.type(searchInput, 'John Doe');

    await waitFor(() => {
      expect(screen.queryByText('Mary Smith')).not.toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('should render patient name as a link', () => {
    render(<BillsTable />);

    const patientNameLink = screen.getByRole('link', { name: 'John Doe' });
    expect(patientNameLink).toBeInTheDocument();

    expect(patientNameLink.getAttribute('href')).toEqual('/home/billing/patient/uuid1/1');
  });

  test('should filter bills by payment status', async () => {
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData.map((bill) => ({ ...bill, status: 'PENDING' })),
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    const filterDropdown = screen.getByText('Pending bills');
    await user.click(filterDropdown);

    const paidBillsOption = screen.getAllByText('Paid bills')[0];
    await user.click(paidBillsOption);

    expect(screen.getByText('noMatchingBillsToDisplay')).toBeInTheDocument();
  });

  test('should show loading state during background updates', () => {
    mockBills.mockImplementationOnce(() => ({
      bills: mockBillsData,
      isLoading: false,
      isValidating: true,
      error: null,
    }));

    render(<BillsTable />);

    const loadingIndicator = screen.getByTitle('loading');
    expect(loadingIndicator).toBeInTheDocument();
  });
});
