import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LinkExtension, createLeftPanelLink } from './left-panel-link.component';

window.getOpenmrsSpaBase = () => '/openmrs/spa/';

describe('LinkExtension Component', () => {
  const renderWithRouter = (component, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(component, { wrapper: MemoryRouter });
  };

  it('renders correctly', () => {
    const config = { name: 'billing', title: 'Billing' };
    renderWithRouter(<LinkExtension config={config} />, {
      route: '/billing/6eb8d678-514d-46ad-9554-51e48d96d567',
    });

    expect(screen.getByText('Billing')).toBeInTheDocument();
  });
});

describe('createLeftPanelLink Function', () => {
  it('returns a component that renders LinkExtension', () => {
    const config = { name: 'billing', title: 'Billing' };
    const TestComponent = createLeftPanelLink(config);

    render(<TestComponent />);
    expect(screen.getByText('Billing')).toBeInTheDocument();
    const testLink = screen.getByRole('link', { name: 'Billing' });
    expect(testLink).toHaveAttribute('href', '/openmrs/spa/home/billing');
  });
});
