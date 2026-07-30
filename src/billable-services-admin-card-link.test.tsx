import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BillableServicesCardLink from './billable-services-admin-card-link.component';

describe('BillableServicesCardLink', () => {
  it('should render billable services admin link', () => {
    renderBillableServicesCardLink();
    const billingAdministrationText = screen.getByText('Billing administration');
    expect(billingAdministrationText).toHaveClass('heading');

    const descriptionText = screen.getByText('Billable services, cash points, payment modes, discounts, and refunds', {
      exact: true,
    });
    expect(descriptionText).toHaveClass('content');

    const billiableServiceLink = screen.getByRole('link', { name: /Billing administration/i });
    expect(billiableServiceLink).toHaveAttribute('href', '/spa/billable-services');
  });
});

function renderBillableServicesCardLink() {
  render(<BillableServicesCardLink />);
}
