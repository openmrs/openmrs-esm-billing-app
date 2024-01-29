import React from 'react';
import { screen, render } from '@testing-library/react';
import BillableServicesDashboard from './dashboard.component';

test('renders an empty state when there are no services', () => {
  renderBillingDashboard();
});

function renderBillingDashboard() {
  render(<BillableServicesDashboard />);
}
