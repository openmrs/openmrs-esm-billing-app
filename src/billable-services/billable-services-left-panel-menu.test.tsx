import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createBillableServicesLeftPanelMenu } from './billable-services-left-panel-menu.component';

const BillingSettingsMenu = createBillableServicesLeftPanelMenu({
  title: 'Billing settings',
  items: [
    { name: 'cash-point-config', title: 'Cash point configuration', path: 'cash-point-config' },
    { name: 'payment-modes-config', title: 'Payment modes configuration', path: 'payment-modes-config' },
  ],
});

// Carbon renders these menu items as anchors without an href, so they have no link role to query by
const getMenuItem = (name: string) =>
  screen.getByText((_, element) => element?.tagName === 'A' && element.textContent === name);

describe('BillableServicesLeftPanelMenu', () => {
  it('marks the menu item for the current page as active', () => {
    window.history.pushState({}, '', '/spa/billable-services/payment-modes-config');
    render(<BillingSettingsMenu />);

    expect(getMenuItem('Payment modes configuration')).toHaveClass('cds--side-nav__link--current');
    expect(getMenuItem('Cash point configuration')).not.toHaveClass('cds--side-nav__link--current');
  });
});
