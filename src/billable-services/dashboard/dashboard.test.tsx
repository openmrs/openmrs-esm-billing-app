import React from 'react';
import { render } from '@testing-library/react';
import { waitForLoadingToFinish } from 'tools/test-helpers';
import BillableServicesDashboard from './dashboard.component';

test('renders an empty state when there are no services', async () => {
  renderBillingDashboard();
  await waitForLoadingToFinish();
});

function renderBillingDashboard() {
  render(<BillableServicesDashboard />);
}
