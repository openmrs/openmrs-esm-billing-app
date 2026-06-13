import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import BillableServicesCardLink from './billable-services-admin-card-link.component';

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn().mockReturnValue({
    t: vi.fn((key, defaultValue) => defaultValue ?? key),
  }),
}));

describe('BillableServicesCardLink', () => {
  beforeEach(() => {
    (window as any).spaBase = '/spa';
  });

  test('should render billable services admin link', () => {
    renderBillableServicesCardLink();
    const manageBillableServicesText = screen.getByText('Manage billable services');
    expect(manageBillableServicesText).toHaveClass('heading');

    const billiableText = screen.getByText('Billable services');
    expect(billiableText).toHaveClass('content');

    const billiableServiceLink = screen.getByRole('link', { name: /Billable services/i });
    expect(billiableServiceLink).toHaveAttribute('href', '/spa/billable-services');
  });
});

function renderBillableServicesCardLink() {
  render(<BillableServicesCardLink />);
}
