import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LinkExtension, createLeftPanelLink } from './left-panel-link.component';
import userEvent from '@testing-library/user-event';

window.getOpenmrsSpaBase = () => '/openmrs/spa/';

describe('LinkExtension Component', () => {
  const renderWithRouter = (component, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(component, { wrapper: MemoryRouter });
  };

  test('renders correctly', () => {
    const config = { name: 'billing', title: 'Billing' };
    renderWithRouter(<LinkExtension config={config} />, {
      route: '/billing/6eb8d678-514d-46ad-9554-51e48d96d567',
    });

    expect(screen.getByText('Billing')).toBeInTheDocument();
  });
});

describe('createLeftPanelLink Function', () => {
  const user = userEvent.setup();
  test('returns a component that renders LinkExtension', () => {
    const config = { name: 'billing', title: 'Billing' };
    const TestComponent = createLeftPanelLink(config);

    render(<TestComponent />);
    expect(screen.getByText('Billing')).toBeInTheDocument();
    const testLink = screen.getByRole('link', { name: 'Billing' });
    user.click(testLink);
    expect(window.location.pathname).toBe('/billing/6eb8d678-514d-46ad-9554-51e48d96d567');
    // expect(testLink).toHaveClass('active-left-nav-link');
  });
});
