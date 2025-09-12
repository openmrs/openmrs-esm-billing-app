import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BillableServices from './billable-services.component';
import { useBillableServices } from './billable-service.resource';

jest.mock('./billable-service.resource', () => ({
  useBillableServices: jest.fn(),
}));

describe('BillableService', () => {
  const mockedUseBillableServices = useBillableServices as jest.Mock;

  it('renders an empty state when there are no billable services', () => {
    mockedUseBillableServices.mockReturnValue({
      billableServices: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
    });

    render(<BillableServices />);

    // Check that empty state is rendered without looking for specific test ID
    expect(screen.getByText('Billable service')).toBeInTheDocument();
    // Check that empty state is visible with some indication
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders billable services table correctly', () => {
    const mockServices = [
      {
        uuid: '1',
        name: 'Service 1',
        shortName: 'S1',
        serviceType: { display: 'Type 1' },
        serviceStatus: 'ACTIVE',
        servicePrices: [{ name: 'Price 1', price: 100 }],
      },
      {
        uuid: '2',
        name: 'Service 2',
        shortName: 'S2',
        serviceType: { display: 'Type 2' },
        serviceStatus: 'ACTIVE',
        servicePrices: [{ name: 'Price 2', price: 200 }],
      },
    ];

    mockedUseBillableServices.mockReturnValue({
      billableServices: mockServices,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
    });

    render(<BillableServices />);

    // Check table headers
    expect(screen.getByText('Service Name')).toBeInTheDocument();
    expect(screen.getByText('Short Name')).toBeInTheDocument();
    expect(screen.getByText('Service Type')).toBeInTheDocument();
    expect(screen.getByText('Service Status')).toBeInTheDocument();

    // Check service data
    expect(screen.getByText('Service 1')).toBeInTheDocument();
    expect(screen.getByText('Service 2')).toBeInTheDocument();
  });

  it('filters services based on search input', async () => {
    const mockServices = [
      {
        uuid: '1',
        name: 'Service 1',
        shortName: 'S1',
        serviceType: { display: 'Type 1' },
        serviceStatus: 'ACTIVE',
        servicePrices: [{ name: 'Price 1', price: 100 }],
      },
      {
        uuid: '2',
        name: 'Different Service',
        shortName: 'S2',
        serviceType: { display: 'Type 2' },
        serviceStatus: 'ACTIVE',
        servicePrices: [{ name: 'Price 2', price: 200 }],
      },
    ];

    mockedUseBillableServices.mockReturnValue({
      billableServices: mockServices,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
    });

    const user = userEvent.setup();
    render(<BillableServices />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'Service 1');

    expect(screen.getByText('Service 1')).toBeInTheDocument();
    expect(screen.queryByText('Different Service')).not.toBeInTheDocument();
  });

  it('shows empty state message when search returns no results', async () => {
    const mockServices = [
      {
        uuid: '1',
        name: 'Service 1',
        shortName: 'S1',
        serviceType: { display: 'Type 1' },
        serviceStatus: 'ACTIVE',
        servicePrices: [{ name: 'Price 1', price: 100 }],
      },
    ];

    mockedUseBillableServices.mockReturnValue({
      billableServices: mockServices,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
    });

    const user = userEvent.setup();
    render(<BillableServices />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'nonexistent service');

    expect(screen.getByText('No matching services to display')).toBeInTheDocument();
    expect(screen.getByText('Check the filters above')).toBeInTheDocument();
  });
});
