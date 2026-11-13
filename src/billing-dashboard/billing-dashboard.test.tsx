import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserHasAccess } from '@openmrs/esm-framework';
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

vi.mock('../refunds/admin/refund-requests.component', () => ({
  default: () => <div>Refund requests table</div>,
}));

vi.mock('../discounts/admin/discount-requests.component', () => ({
  default: () => <div>Discount requests table</div>,
}));

const mockUserHasAccess = vi.mocked(UserHasAccess);

// Carbon Tabs reads window.matchMedia, which jsdom does not implement
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

function grantPrivileges(privileges: Array<string>) {
  mockUserHasAccess.mockImplementation(({ privilege, children }) =>
    privileges.includes(privilege as string) ? <>{children}</> : null,
  );
}

describe('BillingDashboard', () => {
  beforeEach(() => {
    grantPrivileges(['View Bill Refunds', 'View Bill Discounts']);
  });

  it('renders the billing page header', () => {
    renderBillingDashboard();

    const header = screen.getByTestId('billing-header');
    expect(header).toHaveTextContent('Billing');
    expect(header).toHaveTextContent('PaymentsDeskPictogram');
  });

  it('renders the bills, refunds and discounts tabs in order when the user has the view privileges', () => {
    renderBillingDashboard();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Bills', 'Refunds', 'Discounts']);
    expect(screen.getByRole('tab', { name: 'Bills' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders only the bills tab when the user lacks the refund and discount view privileges', () => {
    grantPrivileges([]);

    renderBillingDashboard();

    expect(screen.getByRole('tab', { name: 'Bills' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Refunds' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Discounts' })).not.toBeInTheDocument();
  });

  it('checks each tab against its own view privilege', () => {
    grantPrivileges(['View Bill Discounts']);

    renderBillingDashboard();

    expect(screen.queryByRole('tab', { name: 'Refunds' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Discounts' })).toBeInTheDocument();
  });

  it('renders the refund and discount lists only when their tab is selected', async () => {
    const user = userEvent.setup();

    renderBillingDashboard();

    expect(screen.queryByText('Refund requests table')).not.toBeInTheDocument();
    expect(screen.queryByText('Discount requests table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Refunds' }));

    expect(screen.getByText('Refund requests table')).toBeInTheDocument();
    expect(screen.queryByText('Discount requests table')).not.toBeInTheDocument();
  });

  it('opens the discounts list when the refunds tab is hidden', async () => {
    const user = userEvent.setup();
    grantPrivileges(['View Bill Discounts']);

    renderBillingDashboard();
    await user.click(screen.getByRole('tab', { name: 'Discounts' }));

    expect(screen.getByRole('tab', { name: 'Discounts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Discount requests table')).toBeInTheDocument();
  });

  it('moves between visible tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    grantPrivileges(['View Bill Discounts']);

    renderBillingDashboard();
    await user.click(screen.getByRole('tab', { name: 'Bills' }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Discounts' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Discounts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Discount requests table')).toBeInTheDocument();
  });
});

function renderBillingDashboard() {
  render(<BillingDashboard />);
}
