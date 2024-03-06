import React from 'react';
import { render, screen } from '@testing-library/react';
import { billsSummary } from '../../__mocks__/bills.mock';
import { useBills } from '../billing.resource';
import MetricsCards from './metrics-cards.component';
import { useConfig } from '@openmrs/esm-framework';

const mockUseBills = useBills as jest.Mock;
const mockUseConfig = useConfig as jest.Mock;

jest.mock('../billing.resource', () => ({
  useBills: jest.fn(),
}));

describe('MetricsCards', () => {
  test('renders loading state', () => {
    mockUseBills.mockReturnValue({ isLoading: true, bills: [], error: null });
    renderMetricsCards();
    expect(screen.getByText(/Loading bill metrics.../i)).toBeInTheDocument();
  });

  test('renders error state', () => {
    mockUseBills.mockReturnValue({ isLoading: false, bills: [], error: new Error('Internal server error') });
    renderMetricsCards();
    expect(
      screen.getByText(
        /Sorry, there was a problem displaying this information. You can try to reload this page, or contact the site administrator and quote the error code above./i,
      ),
    ).toBeInTheDocument();
  });

  test('renders metrics cards', () => {
    mockUseBills.mockReturnValue({ isLoading: false, bills: billsSummary, error: null });
    mockUseConfig.mockImplementation(() => ({ defaultCurrency: 'USD' }));
    renderMetricsCards();
    expect(screen.getByRole('heading', { name: /cumulative bills/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pending bills/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /paid bills/i })).toBeInTheDocument();
  });
});

function renderMetricsCards() {
  render(<MetricsCards />);
}
