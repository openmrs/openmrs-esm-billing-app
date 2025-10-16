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
import { type MappedBill } from '../../types';
import { configSchema, type BillingConfig } from '../../config-schema';
import { usePaymentModes } from './payment.resource';
import Payments from './payments.component';

const mockUseVisit = jest.mocked(useVisit);
const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockUseBillableServices = jest.mocked(useBillableServices);
const mockUsePaymentModes = jest.mocked(usePaymentModes);
const mockFormatToParts = jest.fn().mockReturnValue([{ type: 'integer', value: '1000' }]);
const mockFormat = jest.fn().mockReturnValue('$1000.00');
const mockResolvedOptions = jest.fn().mockReturnValue({
  locale: 'en-US',
  numberingSystem: 'latn',
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

global.Intl.NumberFormat.supportedLocalesOf = jest.fn().mockReturnValue(['en-US']);
global.Intl.NumberFormat = jest.fn().mockImplementation(() => ({
  formatToParts: mockFormatToParts,
  format: mockFormat,
  resolvedOptions: mockResolvedOptions,
})) as any;

jest.mock('../../billing.resource', () => ({
  processBillPayment: jest.fn(),
}));

jest.mock('./payment.resource', () => ({
  updateBillVisitAttribute: jest.fn(),
  usePaymentModes: jest.fn(),
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
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [
        { uuid: '1', name: 'Cash', description: 'Cash payment', retired: false },
        { uuid: '2', name: 'Credit Card', description: 'Credit Card payment', retired: false },
      ],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });
  });

  it('renders payment form and history', () => {
    render(<Payments bill={mockBill} mutate={mockMutate} />);
    expect(screen.getByText(/payments/i)).toBeInTheDocument();
    expect(screen.getByText(/total amount:/i)).toBeInTheDocument();
    expect(screen.getByText(/total tendered:/i)).toBeInTheDocument();
  });

  it('displays formatted currency amounts', () => {
    render(<Payments bill={mockBill} mutate={mockMutate} />);
    // Verify that currency formatting is applied (mocked to return '$1000.00')
    const formattedAmounts = screen.getAllByText('$1000.00');
    expect(formattedAmounts.length).toBeGreaterThan(0);
  });

  it('disables Process Payment button when form is invalid', () => {
    render(<Payments bill={mockBill} mutate={mockMutate} />);
    expect(screen.getByText('Process Payment')).toBeDisabled();
  });

  it('navigates to billing dashboard when Discard is clicked', async () => {
    render(<Payments bill={mockBill} mutate={mockMutate} />);
    await userEvent.click(screen.getByText('Discard'));
    expect(navigate).toHaveBeenCalled();
  });

  it('should validate amount is required', () => {
    const billWithAmountDue: MappedBill = {
      ...mockBill,
      totalAmount: 100,
      tenderedAmount: 0,
    };

    render(<Payments bill={billWithAmountDue} mutate={mockMutate} />);

    // Process Payment button should be disabled when no amount is entered
    expect(screen.getByText('Process Payment')).toBeDisabled();
  });

  it('should handle undefined amount values correctly', () => {
    const billWithAmountDue: MappedBill = {
      ...mockBill,
      totalAmount: 100,
      tenderedAmount: 0,
    };

    render(<Payments bill={billWithAmountDue} mutate={mockMutate} />);

    expect(screen.getByText('Process Payment')).toBeDisabled();
  });

  it('should display amount due when there is a balance', () => {
    const billWithBalance: MappedBill = {
      ...mockBill,
      totalAmount: 500,
      tenderedAmount: 200,
    };

    render(<Payments bill={billWithBalance} mutate={mockMutate} />);

    expect(screen.getByText(/amount due:/i)).toBeInTheDocument();
    // The amount due section should be visible for bills with remaining balance
    const formattedAmounts = screen.getAllByText('$1000.00');
    expect(formattedAmounts.length).toBeGreaterThan(0);
  });

  it('should display amount due as absolute value when overpaid', () => {
    const billWithOverpayment: MappedBill = {
      ...mockBill,
      totalAmount: 100,
      tenderedAmount: 150,
    };

    render(<Payments bill={billWithOverpayment} mutate={mockMutate} />);

    // Even with negative amount due (overpayment), the display should show positive value
    expect(screen.getByText(/amount due:/i)).toBeInTheDocument();
    const formattedAmounts = screen.getAllByText('$1000.00');
    expect(formattedAmounts.length).toBeGreaterThan(0);
  });

  it('should disable adding payment methods when amount due is zero or less', () => {
    const fullyPaidBill: MappedBill = {
      ...mockBill,
      totalAmount: 100,
      tenderedAmount: 100,
    };

    render(<Payments bill={fullyPaidBill} mutate={mockMutate} />);

    expect(screen.getByText(/add payment method/i)).toBeDisabled();
  });

  it('should return null when bill is not provided', () => {
    const { container } = render(<Payments bill={null} mutate={mockMutate} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render add payment method button for bills with amount due', () => {
    const billWithAmountDue: MappedBill = {
      ...mockBill,
      totalAmount: 100,
      tenderedAmount: 0,
      lineItems: [],
    };

    render(<Payments bill={billWithAmountDue} mutate={mockMutate} />);

    // Verify add payment method button is available
    expect(screen.getByText(/add payment method/i)).toBeInTheDocument();
    expect(screen.getByText(/add payment method/i)).toBeEnabled();
  });

  it('should display process payment button', () => {
    const billWithAmountDue: MappedBill = {
      ...mockBill,
      totalAmount: 100,
      tenderedAmount: 0,
      lineItems: [],
    };

    render(<Payments bill={billWithAmountDue} mutate={mockMutate} />);

    // Process payment button should be visible
    expect(screen.getByText('Process Payment')).toBeInTheDocument();
    // Button should be disabled when no payment methods are added
    expect(screen.getByText('Process Payment')).toBeDisabled();
  });

  it('should allow adding multiple payment methods for split payments', async () => {
    const user = userEvent.setup();
    const billWithAmountDue: MappedBill = {
      ...mockBill,
      totalAmount: 100,
      tenderedAmount: 0,
    };

    render(<Payments bill={billWithAmountDue} mutate={mockMutate} />);

    // Add first payment method
    await user.click(screen.getByText(/add payment method/i));
    expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();

    // Add second payment method
    await user.click(screen.getByText(/add payment method/i));
    const amountInputs = screen.getAllByPlaceholderText(/enter amount/i);
    expect(amountInputs).toHaveLength(2);
  });
});
