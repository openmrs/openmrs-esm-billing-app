import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useBills } from '../billing.resource';
import RequirePaymentModal from './require-payment-modal.component';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: () => ({ defaultCurrency: 'USD' }),
}));

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
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    (useBills as jest.Mock).mockReturnValue({ bills: [], isLoading: false, error: null });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    expect(screen.getByText('patientBillingAlert')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    (useBills as jest.Mock).mockReturnValue({ bills: [], isLoading: true, error: null });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    expect(screen.getByText('inlineLoading')).toBeInTheDocument();
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
    (useBills as jest.Mock).mockReturnValue({ bills, isLoading: false, error: null });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    expect(screen.getByText('Service 1')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('handles closeModal', () => {
    (useBills as jest.Mock).mockReturnValue({ bills: [], isLoading: false, error: null });
    render(<RequirePaymentModal closeModal={closeModal} patientUuid={patientUuid} />);
    fireEvent.click(screen.getByText('cancel'));
    fireEvent.click(screen.getByText('ok'));
    expect(closeModal).toHaveBeenCalledTimes(2);
  });
});
