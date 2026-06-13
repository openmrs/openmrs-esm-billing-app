import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { useBills } from '../billing.resource';
import VisitBillsPanel from './visit-bills-panel.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockUseBills = vi.mocked<typeof useBills>(useBills);

vi.mock('../billing.resource', () => ({
  useBills: vi.fn(),
  useStockItems: vi.fn(),
}));

vi.mock('../invoice/invoice-table.component', () => ({
  default: () => <div>Invoice Table</div>,
}));

globalThis.i18next = { language: 'en-US' } as any;

const testProps = {
  visit: { uuid: 'visit-uuid-123' },
  patientUuid: 'patient-uuid-456',
};

const mockBillData = [
  {
    uuid: 'bill-1',
    receiptNumber: 'REC-001',
    dateCreated: '2024-01-15T10:00:00.000+0000',
    totalAmount: 500,
    status: 'PENDING',
    lineItems: [{ uuid: 'item-1', billableService: 'Checkup', quantity: 1, price: 500, status: 'PENDING' }],
  },
  {
    uuid: 'bill-2',
    receiptNumber: 'REC-002',
    dateCreated: '2024-01-16T10:00:00.000+0000',
    totalAmount: 700,
    status: 'PAID',
    lineItems: [{ uuid: 'item-2', item: 'Consultation', quantity: 1, price: 700, status: 'PAID' }],
  },
];

describe('VisitBillsPanel', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });
  });

  it('renders loading skeleton while fetching', () => {
    mockUseBills.mockReturnValueOnce({
      bills: [],
      isLoading: true,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    render(<VisitBillsPanel {...testProps} />);
    expect(screen.getByRole('table')).toHaveClass('cds--skeleton');
  });

  it('renders error state when fetch fails', () => {
    mockUseBills.mockReturnValueOnce({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: new Error('fetch failed'),
      mutate: vi.fn(),
    });
    render(<VisitBillsPanel {...testProps} />);
    expect(screen.getByText(/Error/i)).toBeInTheDocument();
  });

  it('renders empty state when no bills exist for the visit', () => {
    mockUseBills.mockReturnValueOnce({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    render(<VisitBillsPanel {...testProps} />);
    expect(screen.getByText(/There are no bills to display/i)).toBeInTheDocument();
  });

  it('renders bills table with correct column headers', () => {
    mockUseBills.mockReturnValueOnce({
      bills: mockBillData as any,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    render(<VisitBillsPanel {...testProps} />);
    expect(screen.getByText('Bill date')).toBeInTheDocument();
    expect(screen.getByText('Invoice number')).toBeInTheDocument();
    expect(screen.getByText('Billed items')).toBeInTheDocument();
    expect(screen.getByText('Bill total')).toBeInTheDocument();
  });

  it('passes patientUuid to useBills', () => {
    mockUseBills.mockReturnValueOnce({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    });
    render(<VisitBillsPanel {...testProps} />);
    expect(mockUseBills).toHaveBeenCalledWith('patient-uuid-456', '');
  });
});
