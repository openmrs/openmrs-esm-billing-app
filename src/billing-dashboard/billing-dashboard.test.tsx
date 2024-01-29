import React from 'react';
import { screen, render } from '@testing-library/react';
import { BillingDashboard } from './billing-dashboard.component';

test('renders an empty state when there are no billing records', () => {
  renderBillingDashboard();

  expect(screen.getByTitle(/billing module illustration/i)).toBeInTheDocument();
});

function renderBillingDashboard() {
  render(<BillingDashboard />);
}
