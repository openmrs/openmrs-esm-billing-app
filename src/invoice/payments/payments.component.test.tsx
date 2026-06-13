import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { useVisit, useConfig, navigate } from '@openmrs/esm-framework';
import { useBillableServices } from '../../billable-services/billable-service.resource';
import { type MappedBill, type LineItem } from '../../types';
import Payments from './payments.component';
import { useStockItems } from '../../billing.resource';

// Mock window.i18next for locale
window.i18next = { language: 'en-US' } as any;

vi.mock('../../billing.resource', () => ({
  processBillPayment: vi.fn(),
}));

vi.mock('../../billable-services/billable-service.resource', () => ({
  useBillableServices: vi.fn(),
}));

vi.mock('../../billing.resource', () => ({
  useStockItems: vi.fn().mockReturnValue({
    stockItems: [],
    isLoadingItem: false,
    isValidating: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

describe('Payments', () => {
  const mockBill: MappedBill = {
    uuid: 'bill-uuid',
    id: 1,
    patientUuid: 'patient-uuid',
    patientName: 'John Doe',
    cashPointUuid: 'cash-point-uuid',
    cashPointName: 'Main Cash Point',
    cashPointLocation: 'Main Hospital',
    cashier: {
      uuid: 'provider-1',
      display: 'Jane Doe',
      links: [
        {
          rel: 'self',
          uri: 'http://example.com/provider/1',
          resourceAlias: 'Jane Doe',
        },
      ],
    },
    payments: [
      {
        uuid: 'payment-1',
        dateCreated: new Date('2023-09-01T12:00:00Z').getTime(),
        amountTendered: 100,
        amount: 80,
        instanceType: {
          uuid: 'instance-1',
          name: 'Credit Card',
          description: 'Credit Card payment',
          retired: false,
        },
        attributes: [],
        voided: false,
        resourceVersion: '1.0',
      },
      {
        uuid: 'payment-2',
        dateCreated: new Date('2023-09-05T14:00:00Z').getTime(),
        amountTendered: 200,
        amount: 180,
        instanceType: {
          uuid: 'instance-2',
          name: 'Cash',
          description: 'Cash payment',
          retired: false,
        },
        attributes: [],
        voided: false,
        resourceVersion: '1.0',
      },
    ],
    receiptNumber: '12345',
    status: 'PAID',
    identifier: 'invoice-123',
    dateCreated: '2023-09-01T12:00:00Z',
    lineItems: [],
    billingService: 'Billing Service',
  };

  const mockMutate = vi.fn();
  const mockSelectedLineItems: LineItem[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    (useVisit as Mock).mockReturnValue({ currentVisit: null });
    (useConfig as Mock).mockReturnValue({ defaultCurrency: 'USD' });
    (useBillableServices as Mock).mockReturnValue({ billableServices: [], isLoading: false });
    (useStockItems as Mock).mockReturnValue({ stockItems: [], isLoadingItem: false });
  });

  it('renders payment form and history', () => {
    render(<Payments bill={mockBill} mutate={mockMutate} selectedLineItems={mockSelectedLineItems} />);
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Total Amount:')).toBeInTheDocument();
    expect(screen.getByText('Total Tendered:')).toBeInTheDocument();
  });

  it.skip('calculates and displays correct amounts', () => {
    render(<Payments bill={mockBill} mutate={mockMutate} selectedLineItems={mockSelectedLineItems} />);
    const amountElements = screen.getAllByText('$1000.00');
    expect(amountElements[amountElements.length - 3]).toBeInTheDocument();
    expect(amountElements[amountElements.length - 2]).toBeInTheDocument();
    expect(amountElements[amountElements.length - 1]).toBeInTheDocument();
  });

  it('disables Process Payment button when form is invalid', () => {
    render(<Payments bill={mockBill} mutate={mockMutate} selectedLineItems={mockSelectedLineItems} />);
    expect(screen.getByText('Process Payment')).toBeDisabled();
  });

  it('navigates to billing dashboard when Discard is clicked', async () => {
    render(<Payments bill={mockBill} mutate={mockMutate} selectedLineItems={mockSelectedLineItems} />);
    await userEvent.click(screen.getByText('Discard'));
    expect(navigate).toHaveBeenCalled();
  });
});
