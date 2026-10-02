import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { useBills } from '../billing.resource';
import { BillingDashboard } from './billing-dashboard.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockUseBills = vi.mocked(useBills);

vi.mock('../billing.resource', () => ({
  useBills: vi.fn(() => ({
    bills: [],
    error: null,
    isLoading: false,
  })),
  usePaginatedBills: vi.fn(() => ({
    bills: [],
    error: null,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
    currentPage: 1,
    totalCount: 0,
    goTo: vi.fn(),
  })),
}));

describe('BillingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'UGX' });
  });

  it('renders an empty state when there are no billing records', () => {
    renderBillingDashboard();

    expect(screen.getByTitle(/billing module illustration/i)).toBeInTheDocument();
  });

  it('does not fetch the complete bill history for dashboard metrics', () => {
    renderBillingDashboard();

    expect(mockUseBills).not.toHaveBeenCalled();
  });
});

function renderBillingDashboard() {
  render(<BillingDashboard />);
}
