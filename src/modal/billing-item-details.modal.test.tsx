import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { type MappedBill, type LineItem } from '../types';
import BillingItemDetailsModal from './billing-item-details.modal';

jest.mock('../helpers', () => ({
  convertToCurrency: (value, currency) => `${currency} ${value.toFixed(2)}`,
}));

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockCloseModal = jest.fn();

const makeLineItem = (overrides: Partial<LineItem> = {}): LineItem => ({
  paymentStatus: 'PENDING',
  quantity: 1,
  price: 100,
  ...overrides,
});

const makeBill = (overrides: Partial<MappedBill> = {}): MappedBill =>
  ({
    receiptNumber: 'REC-001',
    status: 'PENDING',
    lineItems: [makeLineItem()],
    ...overrides,
  }) as MappedBill;

describe('BillingItemDetailsModal', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });
  });

  it('renders the modal correctly with bills and pagination', async () => {
    const user = userEvent.setup();
    const bills = [];

    for (let i = 0; i <= 12; i++) {
      bills.push(
        makeBill({
          uuid: `bill-${i}`,
          receiptNumber: `REC-00${i}`,
          lineItems: [makeLineItem()],
        }),
      );
    }
    render(<BillingItemDetailsModal closeModal={mockCloseModal} bills={bills} />);
    expect(screen.getByText('List of All Billing Items')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Date Created')).toBeInTheDocument();
    expect(screen.getByText('Billed Items')).toBeInTheDocument();
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    expect(screen.getByText('Total Paid')).toBeInTheDocument();
    expect(screen.getByText('Pending Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    expect(screen.getByText('REC-001')).toBeInTheDocument();
    expect(screen.queryByText('REC-0011')).not.toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    const nextPageButton = screen.getByRole('button', { name: /Next page/ });
    const prevPageButton = screen.getByRole('button', { name: /Previous page/ });

    expect(nextPageButton).toBeInTheDocument();
    expect(prevPageButton).toBeInTheDocument();

    await user.click(nextPageButton);

    expect(screen.queryByText('REC-001')).not.toBeInTheDocument();
    expect(screen.getByText('REC-0012')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(prevPageButton);
  });

  it('renders table with 1 bill with 2 line item  and no pagination', () => {
    const bill = makeBill({
      uuid: 'bill-1',
      receiptNumber: 'REC-001',
      lineItems: [makeLineItem(), makeLineItem()],
      totalAmount: 500,
      tenderedAmount: 200,
    });

    render(<BillingItemDetailsModal closeModal={mockCloseModal} bills={[bill]} />);

    expect(screen.getByText('REC-001')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('USD 500.00')).toBeInTheDocument();
    expect(screen.getByText('USD 200.00')).toBeInTheDocument();
    expect(screen.getByText('USD 300.00')).toBeInTheDocument();
  });

  it('calls closeModal when the modal close button is clicked', async () => {
    const user = userEvent.setup();
    render(<BillingItemDetailsModal closeModal={mockCloseModal} bills={[makeBill()]} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockCloseModal).toHaveBeenCalled();
  });
});
