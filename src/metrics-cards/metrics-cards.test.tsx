import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { billsSummary } from '../../__mocks__/bills.mock';
import { useBills } from '../billing.resource';
import { type MappedBill } from '../types';
import { configSchema, type BillingConfig } from '../config-schema';
import MetricsCards from './metrics-cards.component';

const mockUseBills = vi.mocked<typeof useBills>(useBills);
const mockUseConfig = vi.mocked(useConfig<BillingConfig>);

vi.mock('../billing.resource', () => ({
  useBills: vi.fn(),
}));

describe('MetricsCards', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });
  });

  it('renders loading state', () => {
    mockUseBills.mockReturnValue({ isLoading: true, bills: [], error: null, isValidating: false, mutate: vi.fn() });
    renderMetricsCards();
    expect(screen.getByText(/Loading bill metrics.../i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseBills.mockReturnValue({
      isLoading: false,
      bills: [],
      error: new Error('Internal server error'),
      isValidating: false,
      mutate: vi.fn(),
    });
    renderMetricsCards();
    expect(screen.getByText(/error state/i)).toBeInTheDocument();
  });

  it('renders metrics cards', () => {
    mockUseBills.mockReturnValue({
      isLoading: false,
      bills: billsSummary as unknown as MappedBill[],
      error: null,
      isValidating: false,
      mutate: vi.fn(),
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
