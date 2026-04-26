import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen, render } from '@testing-library/react';
import { BillingDashboard } from './billing-dashboard.component';

describe('BillingDashboard', () => {
  it('renders an empty state when there are no billing records', () => {
    renderBillingDashboard();

    expect(screen.getByTitle(/billing module illustration/i)).toBeInTheDocument();
  });
});

function renderBillingDashboard() {
  render(<BillingDashboard />);
}
