import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BillableCommodities from './billable-commodities.component';
import { useBillableCommodities } from '../billable-services/billable-service.resource';

// Mock the resource
vi.mock('../billable-services/billable-service.resource', () => ({
  useBillableCommodities: vi.fn(),
}));

// Mock @openmrs/esm-framework
vi.mock('@openmrs/esm-framework', () => ({
  EmptyCard: vi.fn(({ displayText, headerTitle }) => (
    <div data-testid="empty-card">
      <h1>{headerTitle}</h1>
      <p>{displayText}</p>
    </div>
  )),
  useLayoutType: vi.fn(() => 'desktop'),
  isDesktop: vi.fn(() => true),
  useConfig: vi.fn(() => ({
    billableServices: {
      pageSizes: [10, 20, 30, 40, 50],
      pageSize: 10,
    },
  })),
  usePagination: vi.fn().mockImplementation((data) => ({
    currentPage: 1,
    goTo: vi.fn(),
    results: data,
    paginated: true,
  })),
  launchWorkspace2: vi.fn(),
  ErrorState: vi.fn(({ error }) => <div>Error: {error?.message || error}</div>),
  restBaseUrl: 'http://localhost',
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValueOrOptions: string | object) => {
      // Handle both t('key', 'defaultValue') and t('key', { defaultValue: 'value' }) formats
      if (typeof defaultValueOrOptions === 'string') {
        return defaultValueOrOptions;
      }
      if (typeof defaultValueOrOptions === 'object' && defaultValueOrOptions !== null) {
        return (defaultValueOrOptions as { defaultValue?: string }).defaultValue || key;
      }
      return key;
    },
  }),
}));

describe('BillableCommodities', () => {
  const mockedUseBillableCommodities = useBillableCommodities as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an empty state when there are no billable commodities', () => {
    mockedUseBillableCommodities.mockReturnValue({
      billableCommodities: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<BillableCommodities />);

    expect(screen.getByTestId('empty-card')).toBeInTheDocument();
    expect(screen.getAllByText('Billable Commodity')).toHaveLength(2);
  });

  it('renders billable commodities table correctly', () => {
    const mockCommodities = [
      {
        uuid: '1',
        item: 'Paracetamol 500mg',
        shortName: 'PARA',
        paymentMode: { uuid: 'pm1', name: 'Cash' },
        price: 100,
      },
      {
        uuid: '2',
        item: 'Amoxicillin 250mg',
        shortName: 'AMOX',
        paymentMode: { uuid: 'pm2', name: 'Mobile Money' },
        price: 200,
      },
    ];

    mockedUseBillableCommodities.mockReturnValue({
      billableCommodities: mockCommodities,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<BillableCommodities />);

    // Check table headers
    expect(screen.getByText('Item Name')).toBeInTheDocument();
    expect(screen.getByText('Short Name')).toBeInTheDocument();
    expect(screen.getByText('Payment Mode')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();

    // Check commodity data
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 250mg')).toBeInTheDocument();
    expect(screen.getByText('Cash (100)')).toBeInTheDocument();
    expect(screen.getByText('Mobile Money (200)')).toBeInTheDocument();
  });

  it('filters commodities based on search input', async () => {
    const mockCommodities = [
      {
        uuid: '1',
        item: 'Paracetamol 500mg',
        shortName: 'PARA',
        paymentMode: { uuid: 'pm1', name: 'Cash' },
        price: 100,
      },
      {
        uuid: '2',
        item: 'Amoxicillin 250mg',
        shortName: 'AMOX',
        paymentMode: { uuid: 'pm2', name: 'Mobile Money' },
        price: 200,
      },
    ];

    mockedUseBillableCommodities.mockReturnValue({
      billableCommodities: mockCommodities,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });

    const user = userEvent.setup();
    render(<BillableCommodities />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'Paracetamol');

    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.queryByText('Amoxicillin 250mg')).not.toBeInTheDocument();
  });

  it('shows empty state message when search returns no results', async () => {
    const mockCommodities = [
      {
        uuid: '1',
        item: 'Paracetamol 500mg',
        shortName: 'PARA',
        paymentMode: { uuid: 'pm1', name: 'Cash' },
        price: 100,
      },
    ];

    mockedUseBillableCommodities.mockReturnValue({
      billableCommodities: mockCommodities,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });

    const user = userEvent.setup();
    render(<BillableCommodities />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'nonexistent commodity');

    expect(screen.getByText('No matching commodities to display')).toBeInTheDocument();
    expect(screen.getByText('Check the filters above')).toBeInTheDocument();
  });

  it('renders price as -- when paymentMode is null but price exists', () => {
    const mockCommodities = [
      {
        uuid: '1',
        item: 'Test Item',
        shortName: 'TEST',
        paymentMode: null,
        price: 100,
      },
    ];

    mockedUseBillableCommodities.mockReturnValue({
      billableCommodities: mockCommodities,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<BillableCommodities />);

    // Check the full row is rendered with -- for price
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('TEST')).toBeInTheDocument();

    // Find all -- elements (there are multiple, so we check if at least one exists)
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders price as -- when both paymentMode and price are null/undefined', () => {
    const mockCommodities = [
      {
        uuid: '1',
        item: 'Test Item Two',
        shortName: 'TEST2',
        paymentMode: null,
        price: null,
      },
    ];

    mockedUseBillableCommodities.mockReturnValue({
      billableCommodities: mockCommodities,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });

    render(<BillableCommodities />);

    expect(screen.getByText('Test Item Two')).toBeInTheDocument();

    // Find all -- elements
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBeGreaterThan(0);
  });
});
