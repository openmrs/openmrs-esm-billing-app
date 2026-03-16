import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentStatusBadge from './payment-status-badge.component';
import { useBills } from '../billing.resource';
import { usePagination, usePaginationInfo } from '@openmrs/esm-framework';

// Mock modules
jest.mock('../billing.resource', () => ({
  useBills: jest.fn(),
}));

jest.mock('../helpers', () => ({
  convertToCurrency: jest.fn((amount, currency) => `${currency} ${Number(amount).toFixed(2)}`),
}));

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: jest.fn().mockReturnValue({ defaultCurrency: 'USD' }),
  getCoreTranslation: jest.fn((k) => k),
  usePagination: jest.fn((rows) => ({
    paginated: false,
    goTo: jest.fn(),
    goToNext: jest.fn(),
    goToPrevious: jest.fn(),
    results: rows,
    currentPage: 1,
    totalPages: 1,
    showNextButton: false,
    showPreviousButton: false,
  })),
  usePaginationInfo: jest.fn(() => ({ pageSizes: [10], pageItemsCount: 10 })),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

const mockUseBills = useBills as jest.Mock;
const mockUsePagination = usePagination as jest.Mock;
const mockUsePaginationInfo = usePaginationInfo as jest.Mock;

describe('PaymentStatusBadge', () => {
  const patientUuid = 'prob-patient-uuid';

  beforeEach(() => {
    mockUsePagination.mockImplementation((rows) => ({
      paginated: false,
      goTo: jest.fn(),
      goToNext: jest.fn(),
      goToPrevious: jest.fn(),
      results: rows,
      currentPage: 1,
      totalPages: 1,
      showNextButton: false,
      showPreviousButton: false,
    }));
    mockUsePaginationInfo.mockReturnValue({ pageSizes: [10], pageItemsCount: 10 });
  });

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

  it('renders UNPAID status when finalized bills have no payment', () => {
    mockUseBills.mockReturnValue({
      bills: [{ uuid: '1', totalAmount: 100, tenderedAmount: 0, status: 'POSTED' }],
      isLoading: false,
    });
    render(<PaymentStatusBadge patientUuid={patientUuid} />);
    const badge = screen.getByText('Unpaid');
    expect(badge).toBeInTheDocument();
  });

  it('renders PARTIALLY_PAID status when finalized bills are partially settled', () => {
    mockUseBills.mockReturnValue({
      bills: [
        { uuid: '1', totalAmount: 100, tenderedAmount: 0, status: 'POSTED' },
        { uuid: '2', totalAmount: 100, tenderedAmount: 100, status: 'PAID' },
      ],
      isLoading: false,
    });
    render(<PaymentStatusBadge patientUuid={patientUuid} />);
    const badge = screen.getByText('Partially Paid');
    expect(badge).toBeInTheDocument();
  });

  it('does not render when all bills are pending', () => {
    mockUseBills.mockReturnValue({
      bills: [{ uuid: '1', totalAmount: 100, tenderedAmount: 0, status: 'PENDING' }],
      isLoading: false,
    });
    const { container } = render(<PaymentStatusBadge patientUuid={patientUuid} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when finalized bills have zero total amount', () => {
    mockUseBills.mockReturnValue({
      bills: [{ uuid: '1', totalAmount: 0, tenderedAmount: 0, status: 'POSTED' }],
      isLoading: false,
    });
    const { container } = render(<PaymentStatusBadge patientUuid={patientUuid} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the payment status details modal when the badge is clicked', () => {
    mockUseBills.mockReturnValue({
      bills: [
        {
          uuid: '1',
          totalAmount: 100,
          tenderedAmount: 100,
          status: 'PAID',
          dateCreated: '2023-01-01',
          receiptNumber: 'INV-001',
          lineItems: [
            { uuid: 'line-1', billableService: 'Consultation', paymentStatus: 'PAID', quantity: 1, price: 100 },
          ],
        },
      ],
      isLoading: false,
    });

    render(<PaymentStatusBadge patientUuid={patientUuid} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open payment status details' }));

    expect(screen.getByText('Payment Status Details')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });
});
