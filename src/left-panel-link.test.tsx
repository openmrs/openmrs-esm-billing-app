import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getDefaultsFromConfigSchema, useConfig, UserHasAccess } from '@openmrs/esm-framework';
import type * as Framework from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from './config-schema';
import { LinkExtension, createLeftPanelLink } from './left-panel-link.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockUserHasAccess = vi.mocked(UserHasAccess);

vi.mock('@openmrs/esm-framework', async (importOriginal) => {
  const actual = await importOriginal<typeof Framework>();
  return {
    ...actual,
    UserHasAccess: vi.fn(({ children }) => children),
  };
});

window.getOpenmrsSpaBase = () => '/openmrs/spa/';

describe('LinkExtension Component', () => {
  const renderWithRouter = (component, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(component, { wrapper: MemoryRouter });
  };

  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema) } as BillingConfig);
  });

  it('renders correctly', () => {
    const config = { name: 'billing', title: 'Billing' };
    renderWithRouter(<LinkExtension config={config} />, {
      route: '/billing/6eb8d678-514d-46ad-9554-51e48d96d567',
    });

    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('renders the link directly when no privilege is configured', () => {
    const config = { name: 'billing', title: 'Billing' };
    renderWithRouter(<LinkExtension config={config} />, { route: '/' });

    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(mockUserHasAccess).not.toHaveBeenCalled();
  });

  it('wraps the link in UserHasAccess when a privilege is configured', () => {
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      billingLink: { privilege: 'Billing: View Bills' },
    } as BillingConfig);

    const config = { name: 'billing', title: 'Billing' };
    renderWithRouter(<LinkExtension config={config} />, { route: '/' });

    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(mockUserHasAccess).toHaveBeenCalledWith(
      expect.objectContaining({ privilege: 'Billing: View Bills' }),
      expect.anything(),
    );
  });

  it('prefers the privilege from the link config over the configured default', () => {
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      billingLink: { privilege: 'Billing: View Bills' },
    } as BillingConfig);

    const config = { name: 'billing', title: 'Billing', privilege: 'coreapps.systemAdministration' };
    renderWithRouter(<LinkExtension config={config} />, { route: '/' });

    expect(mockUserHasAccess).toHaveBeenCalledWith(
      expect.objectContaining({ privilege: 'coreapps.systemAdministration' }),
      expect.anything(),
    );
  });
});

describe('createLeftPanelLink Function', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema) } as BillingConfig);
  });

  it('returns a component that renders LinkExtension', () => {
    const config = { name: 'billing', title: 'Billing' };
    const TestComponent = createLeftPanelLink(config);

    render(<TestComponent />);
    expect(screen.getByText('Billing')).toBeInTheDocument();
    const testLink = screen.getByRole('link', { name: 'Billing' });
    expect(testLink).toHaveAttribute('href', '/openmrs/spa/home/billing');
  });
});
