import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentStatusBadge from './payment-status-badge.component';
import { useBills } from '../billing.resource';

// Mock Intl.NumberFormat for test environment
const mockNumberFormat = function (locale, options) {
  return {
    format: (value: number) => `USD ${Number(value).toFixed(2)}`,
    resolvedOptions: () => ({}),
  };
};

// @ts-ignore
mockNumberFormat.supportedLocalesOf = () => ['en'];

beforeAll(() => {
  // @ts-ignore
  global.Intl.NumberFormat = mockNumberFormat;
  // @ts-ignore
  if (typeof window !== 'undefined') window.Intl.NumberFormat = mockNumberFormat;
  // @ts-ignore
  if (typeof globalThis !== 'undefined') globalThis.Intl.NumberFormat = mockNumberFormat;
});

// Mock modules
jest.mock('../billing.resource', () => ({
  useBills: jest.fn(),
}));

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: jest.fn().mockReturnValue({ defaultCurrency: 'USD' }),
  getCoreTranslation: jest.fn((k) => k),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

const mockUseBills = useBills as jest.Mock;

describe('PaymentStatusBadge', () => {
  const patientUuid = 'prob-patient-uuid';

  it('does not render when loading', () => {
    mockUseBills.mockReturnValue({ bills: [], isLoading: true });
    const { container } = render(<PaymentStatusBadge patientUuid={patientUuid} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when there are no bills', () => {
    mockUseBills.mockReturnValue({ bills: [], isLoading: false });
    const { container } = render(<PaymentStatusBadge patientUuid={patientUuid} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders PAID status when full payment is received', () => {
    mockUseBills.mockReturnValue({
      bills: [
        { uuid: '1', totalAmount: 100, tenderedAmount: 100, status: 'PAID' },
        { uuid: '2', totalAmount: 50, tenderedAmount: 50, status: 'PAID' },
      ],
      isLoading: false,
    });
    render(<PaymentStatusBadge patientUuid={patientUuid} />);
    const badge = screen.getByText('Paid');
    expect(badge).toBeInTheDocument();
  });

  it('renders UNPAID status when no payment is received', () => {
    mockUseBills.mockReturnValue({
      bills: [{ uuid: '1', totalAmount: 100, tenderedAmount: 0, status: 'UNPAID' }],
      isLoading: false,
    });
    render(<PaymentStatusBadge patientUuid={patientUuid} />);
    const badge = screen.getByText('Unpaid');
    expect(badge).toBeInTheDocument();
  });

  it('renders PARTIALLY_PAID status when some payment is received', () => {
    mockUseBills.mockReturnValue({
      bills: [{ uuid: '1', totalAmount: 100, tenderedAmount: 50, status: 'PARTIALLY_PAID' }],
      isLoading: false,
    });
    render(<PaymentStatusBadge patientUuid={patientUuid} />);
    const badge = screen.getByText('Partially Paid');
    expect(badge).toBeInTheDocument();
  });

  it('opens modal when badge is clicked', () => {
    mockUseBills.mockReturnValue({
      bills: [
        {
          uuid: '1',
          totalAmount: 100,
          tenderedAmount: 100,
          status: 'PAID',
          dateCreated: '2023-01-01',
          receiptNumber: 'INV-001',
        },
      ],
      isLoading: false,
    });
    render(<PaymentStatusBadge patientUuid={patientUuid} />);
    const badge = screen.getByText('Paid');
    fireEvent.click(badge);
    expect(screen.getByText('Payment Status Details')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });
});
