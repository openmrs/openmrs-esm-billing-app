import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import BillablesConfigurationTabs from './billables-config-tabs.component';

vi.mock('../dashboard/dashboard.component', () => ({
  default: () => <div>Services content</div>,
}));

vi.mock('../../billable-commodities/billable-commodities.component', () => ({
  default: () => <div>Commodities content</div>,
}));

beforeAll(() => {
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
});

describe('BillablesConfigurationTabs', () => {
  it('shows billable services on the root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BillablesConfigurationTabs />
      </MemoryRouter>,
    );

    expect(screen.getByRole('tab', { name: /billable services/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /billable commodities/i })).toBeInTheDocument();
    expect(screen.getByText('Services content')).toBeInTheDocument();
    expect(screen.queryByText('Commodities content')).not.toBeInTheDocument();
  });

  it('shows billable commodities on its route', () => {
    render(
      <MemoryRouter initialEntries={['/billable-commodities']}>
        <BillablesConfigurationTabs />
      </MemoryRouter>,
    );

    expect(screen.getByText('Commodities content')).toBeInTheDocument();
    expect(screen.queryByText('Services content')).not.toBeInTheDocument();
  });
});
