import React from 'react';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { billsSummary } from '../../__mocks__/bills.mock';
import { useBills } from '../billing.resource';
import { type MappedBill } from '../types';
import { configSchema, type BillingConfig } from '../config-schema';
import MetricsCards from './metrics-cards.component';

const mockUseBills = jest.mocked<typeof useBills>(useBills);
const mockUseConfig = jest.mocked(useConfig<BillingConfig>);

jest.mock('../billing.resource', () => ({
  useBills: jest.fn(),
}));

describe('MetricsCards', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });
  });

  test('renders loading state', () => {
    mockUseBills.mockReturnValue({ isLoading: true, bills: [], error: null, isValidating: false, mutate: jest.fn() });
    renderMetricsCards();
    expect(screen.getByText(/Loading bill metrics.../i)).toBeInTheDocument();
  });

  test('renders error state', () => {
    mockUseBills.mockReturnValue({
      isLoading: false,
      bills: [],
      error: new Error('Internal server error'),
      isValidating: false,
      mutate: jest.fn(),
    });
    renderMetricsCards();
    expect(
      screen.getByText(
        /Sorry, there was a problem displaying this information. You can try to reload this page, or contact the site administrator and quote the error code above./i,
      ),
    ).toBeInTheDocument();
  });

  test('renders metrics cards', () => {
    mockUseBills.mockReturnValue({
      isLoading: false,
      bills: billsSummary as unknown as MappedBill[],
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });
    renderMetricsCards();
    expect(screen.getByRole('heading', { name: /cumulative bills/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pending bills/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /paid bills/i })).toBeInTheDocument();
  });
});

function renderMetricsCards() {
  render(<MetricsCards />);
}
