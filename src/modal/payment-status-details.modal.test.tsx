import React from 'react';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig, usePagination, usePaginationInfo } from '@openmrs/esm-framework';
import { type MappedBill } from '../types';
import { configSchema, type BillingConfig } from '../config-schema';
import PaymentStatusDetailsModal from './payment-status-details.modal';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockUsePagination = jest.mocked(usePagination);
const mockUsePaginationInfo = jest.mocked(usePaginationInfo);

jest.mock('../helpers', () => ({
  convertToCurrency: jest.fn((amount, currency) => `${currency} ${Number(amount).toFixed(2)}`),
}));

describe('PaymentStatusDetailsModal', () => {
  const closeModal = jest.fn();

  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      defaultCurrency: 'USD',
      pageSize: 1,
    });
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
    mockUsePaginationInfo.mockReturnValue({ pageSizes: [1], pageItemsCount: 1 });
  });

  it('renders line item payment details', () => {
    const bills = [
      {
        uuid: 'bill-1',
        receiptNumber: 'INV-001',
        dateCreated: '2023-01-01',
        status: 'PAID',
        lineItems: [
          {
            uuid: 'line-1',
            billableService: 'Consultation',
            paymentStatus: 'PAID',
            quantity: 1,
            price: 100,
          },
        ],
      },
    ] as unknown as MappedBill[];

    render(<PaymentStatusDetailsModal closeModal={closeModal} isOpen={true} bills={bills} isLoading={false} />);

    expect(screen.getByText('Payment Status Details')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('USD 100.00')).toBeInTheDocument();
  });

  it('includes pending bills in the details view', () => {
    const bills = [
      {
        uuid: 'bill-1',
        receiptNumber: 'INV-001',
        dateCreated: '2023-01-01',
        status: 'PENDING',
        lineItems: [
          {
            uuid: 'line-1',
            billableService: 'Consultation',
            paymentStatus: 'PENDING',
            quantity: 1,
            price: 100,
          },
        ],
      },
    ] as unknown as MappedBill[];

    render(<PaymentStatusDetailsModal closeModal={closeModal} isOpen={true} bills={bills} isLoading={false} />);

    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('Consultation')).toBeInTheDocument();
  });

  it('shows pagination when there are more rows than the configured page size', () => {
    const bills = [
      {
        uuid: 'bill-1',
        receiptNumber: 'INV-001',
        dateCreated: '2023-01-01',
        status: 'PAID',
        lineItems: [
          { uuid: 'line-1', billableService: 'Consultation', paymentStatus: 'PAID', quantity: 1, price: 100 },
          { uuid: 'line-2', billableService: 'Lab', paymentStatus: 'PAID', quantity: 1, price: 50 },
        ],
      },
    ] as unknown as MappedBill[];

    mockUsePagination.mockImplementation((rows) => ({
      paginated: true,
      goTo: jest.fn(),
      goToNext: jest.fn(),
      goToPrevious: jest.fn(),
      results: rows.slice(0, 1),
      currentPage: 1,
      totalPages: 2,
      showNextButton: true,
      showPreviousButton: false,
    }));
    mockUsePaginationInfo.mockReturnValue({ pageSizes: [1], pageItemsCount: 1 });

    render(<PaymentStatusDetailsModal closeModal={closeModal} isOpen={true} bills={bills} isLoading={false} />);

    expect(screen.getByText(/items per page/i)).toBeInTheDocument();
    expect(screen.getByText(/1–1 of 2 items/i)).toBeInTheDocument();
  });
});
