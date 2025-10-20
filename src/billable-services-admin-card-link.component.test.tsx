import React from 'react';
import { render, screen } from '@testing-library/react';
import BillableServicesCardLink from './billable-services-admin-card-link.component';

describe('BillableServicesCardLink', () => {
  test('should render billable services admin link', () => {
    renderBillableServicesCardLink();
    const manageBillableServicesText = screen.getByText('Manage billable services');
    expect(manageBillableServicesText).toHaveClass('heading');

    const billiableText = screen.getByText('Billable services', { exact: true });
    expect(billiableText).toHaveClass('content');

    const billiableServiceLink = screen.getByRole('link', { name: /Manage billable services/i });
    expect(billiableServiceLink).toHaveAttribute('href', '/spa/billable-services');
  });
});

function renderBillableServicesCardLink() {
  render(<BillableServicesCardLink />);
}
