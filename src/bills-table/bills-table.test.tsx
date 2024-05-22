import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useBills } from '../billing.resource';
import BillsTable from './bills-table.component';

const mockbills = useBills as jest.Mock;

const mockBillsData = [
  { uuid: '1', patientName: 'John Doe', identifier: '12345678', visitType: 'Checkup', patientUuid: 'uuid1' },
  { uuid: '2', patientName: 'Mary Smith', identifier: '98765432', visitType: 'Wake up', patientUuid: 'uuid2' },
];

jest.mock('../billing.resource', () => ({
  ...jest.requireActual('../billing.resource'),
  useBills: jest.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
  })),
}));

jest.mock('@openmrs/esm-framework', () => ({
  ...jest.requireActual('@openmrs/esm-framework'),
  ErrorState: jest.fn(() => (
    <div>
      Sorry, there was a problem displaying this information. You can try to reload this page, or contact the site
      administrator and quote the error code above.
    </div>
  )),
  useConfig: jest.fn(() => ({ bills: { pageSizes: [10, 20, 30, 40, 50], pageSize: 10 } })),
  usePagination: jest.fn().mockImplementation((data) => ({
    currentPage: 1,
    goTo: () => {},
    results: data,
    paginated: false,
  })),
}));

describe('BillsTable', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  xit('renders data table with pending bills', () => {
    render(<BillsTable />);

    expect(screen.getByText('Visit time')).toBeInTheDocument();
    expect(screen.getByText('Identifier')).toBeInTheDocument();
    const expectedColumnHeaders = [/Visit time/, /Identifier/, /Name/, /Billing service/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeInTheDocument();
    });

    const patientNameLink = screen.getByText('John Doe');
    expect(patientNameLink).toBeInTheDocument();
    expect(patientNameLink.tagName).toBe('A');
  });

  it('displays empty state when there are no bills', () => {
    mockbills.mockImplementationOnce(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    expect(screen.getByText(/there are no bills to display/i)).toBeInTheDocument();
  });

  it('should not display the table when the data is loading', () => {
    mockbills.mockImplementationOnce(() => ({
      bills: undefined,
      isLoading: true,
      isValidating: false,
      error: null,
    }));

    render(<BillsTable />);

    const expectedColumnHeaders = [/Visit time/, /Identifier/, /Name/, /Billing service/, /Department/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.queryByRole('columnheader', { name: new RegExp(header, 'i') })).not.toBeInTheDocument();
    });
  });

  it('should display the error state when there is error', () => {
    mockbills.mockImplementationOnce(() => ({
      activeVisits: undefined,
      isLoading: false,
      isValidating: false,
      error: 'Error in fetching data',
    }));

    render(<BillsTable />);

    expect(screen.getByText(/sorry, there was a problem displaying this information/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('should filter bills by search term and bill payment status', async () => {
    render(<BillsTable />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'John Doe');

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Mary Smith')).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, 'Mary Smith');

    expect(screen.getByText('Mary Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    // Should filter the table when bill payment status combobox is changed
    const billCategorySelect = screen.getByRole('combobox');
    expect(billCategorySelect).toBeInTheDocument();
    await user.click(billCategorySelect, { name: 'Pending bills' });
    expect(mockbills).toHaveBeenCalledWith('', 'PENDING');

    await user.click(screen.getByText('All bills'));
    expect(screen.getByText('All bills')).toBeInTheDocument();
    expect(mockbills).toHaveBeenCalledWith('', '');
  });

  test('should show the loading spinner while retrieving data', () => {
    mockbills.mockImplementationOnce(() => ({
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

  test('should render patient name as a link', async () => {
    render(<BillsTable />);

    const patientNameLink = screen.getByRole('link', { name: 'John Doe' });
    expect(patientNameLink).toBeInTheDocument();
    expect(patientNameLink).toHaveAttribute('href', '/openmrs/spa/home/billing/patient/uuid1/1');
  });
});
