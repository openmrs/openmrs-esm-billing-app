import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { BillingDashboard } from './billing-dashboard.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);

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

  it('renders the billing page header', () => {
    renderBillingDashboard();

    const header = screen.getByTestId('billing-header');
    expect(header).toHaveTextContent('Billing');
    expect(header).toHaveTextContent('PaymentsDeskPictogram');
  });
});

function renderBillingDashboard() {
  render(<BillingDashboard />);
}
