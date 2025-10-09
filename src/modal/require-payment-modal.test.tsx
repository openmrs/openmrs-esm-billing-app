import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { useBills } from '../billing.resource';
import { type MappedBill } from '../types';
import { configSchema, type BillingConfig } from '../config-schema';
import RequirePaymentModal from './require-payment.modal';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockUseBills = jest.mocked<typeof useBills>(useBills);

jest.mock('../billing.resource', () => ({
  useBills: jest.fn(),
}));

jest.mock('../helpers', () => ({
  convertToCurrency: (value, currency) => `${currency} ${value.toFixed(2)}`,
}));

describe('RequirePaymentModal', () => {
  const closeModal = jest.fn();
  const patientUuid = '12345';

  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });
  });

  it('renders correctly', () => {
    mockUseBills.mockReturnValue({ bills: [], isLoading: false, error: null, isValidating: false, mutate: jest.fn() });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    expect(screen.getByText('Patient Billing Alert')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUseBills.mockReturnValue({ bills: [], isLoading: true, error: null, isValidating: false, mutate: jest.fn() });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    expect(screen.getByText('Loading bill items...')).toBeInTheDocument();
  });

  it('displays line items', () => {
    const bills = [
      {
        status: 'UNPAID',
        lineItems: [
          { billableService: 'Service 1', quantity: 1, price: 100 },
          { item: 'Item 1', quantity: 2, price: 50 },
        ],
      },
    ];
    mockUseBills.mockReturnValue({
      bills: bills as unknown as MappedBill[],
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    expect(screen.getByText('Service 1')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('handles closeModal', async () => {
    const user = userEvent.setup();
    mockUseBills.mockReturnValue({ bills: [], isLoading: false, error: null, isValidating: false, mutate: jest.fn() });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    await user.click(screen.getByText('Cancel'));
    await user.click(screen.getByText('OK'));
    expect(closeModal).toHaveBeenCalledTimes(2);
  });
});
