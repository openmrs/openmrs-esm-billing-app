import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import {
  useVisit,
  useConfig,
  navigate,
  getDefaultsFromConfigSchema,
  type VisitReturnType,
} from '@openmrs/esm-framework';
import { useBillableServices } from '../../billable-services/billable-service.resource';
import { type MappedBill, type LineItem } from '../../types';
import { configSchema, type BillingConfig } from '../../config-schema';
import Payments from './payments.component';

const mockUseVisit = jest.mocked(useVisit);
const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockUseBillableServices = jest.mocked(useBillableServices);
const mockFormatToParts = jest.fn().mockReturnValue([{ type: 'integer', value: '1000' }]);
const mockFormat = jest.fn().mockReturnValue('$1000.00');
global.Intl.NumberFormat = jest.fn().mockImplementation(() => ({
  formatToParts: mockFormatToParts,
  format: mockFormat,
})) as any;
global.Intl.NumberFormat.supportedLocalesOf = jest.fn().mockReturnValue(['en-US']);

jest.mock('../../billing.resource', () => ({
  processBillPayment: jest.fn(),
}));

jest.mock('../../billable-services/billable-service.resource', () => ({
  useBillableServices: jest.fn(),
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

  const mockMutate = jest.fn();
  const mockSelectedLineItems: LineItem[] = [];

  beforeEach(() => {
    mockUseVisit.mockReturnValue({ currentVisit: null } as unknown as VisitReturnType);
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });
    mockUseBillableServices.mockReturnValue({
      billableServices: [],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: jest.fn(),
    });
  });

  it('renders payment form and history', () => {
    render(<Payments bill={mockBill} mutate={mockMutate} selectedLineItems={mockSelectedLineItems} />);
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Total Amount:')).toBeInTheDocument();
    expect(screen.getByText('Total Tendered:')).toBeInTheDocument();
  });

  it('calculates and displays correct amounts', () => {
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
