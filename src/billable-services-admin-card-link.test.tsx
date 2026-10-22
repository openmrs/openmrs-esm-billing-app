import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import BillableServicesCardLink from './billable-services-admin-card-link.component';

describe('BillableServicesCardLink', () => {
  it('should render billable services admin link', () => {
    renderBillableServicesCardLink();
    const headingText = screen.getByText('Manage billing');
    expect(headingText).toHaveClass('heading');

    const contentText = screen.getByText('Billing administration', { exact: true });
    expect(contentText).toHaveClass('content');

    const billiableServiceLink = screen.getByRole('link', { name: /Billing administration/i });
    expect(billiableServiceLink).toHaveAttribute('href', '/spa/billable-services');
  });
});

function renderBillableServicesCardLink() {
  render(<BillableServicesCardLink />);
}
