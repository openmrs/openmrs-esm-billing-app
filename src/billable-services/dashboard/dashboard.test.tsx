import React from 'react';
import { it } from 'vitest';
import { waitForLoadingToFinish } from '@tools/test-helpers';
import { render } from '@testing-library/react';
import BillableServicesDashboard from './dashboard.component';

it('renders an empty state when there are no services', async () => {
  renderBillingDashboard();
  await waitForLoadingToFinish();
});

function renderBillingDashboard() {
  render(<BillableServicesDashboard />);
}
