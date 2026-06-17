import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import { BillingDashboard } from './billing-dashboard.component';

vi.mock('../billing.resource', () => ({
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
  it('renders an empty state when there are no billing records', () => {
    renderBillingDashboard();

    expect(screen.getByTitle(/billing module illustration/i)).toBeInTheDocument();
  });
});

function renderBillingDashboard() {
  render(<BillingDashboard />);
}
