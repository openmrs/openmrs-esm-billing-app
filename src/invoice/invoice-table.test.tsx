import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import InvoiceTable from './invoice-table.component';
import { showModal, useConfig, useDebounce } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { MappedBill } from '../types';

// Mocking dependencies
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: jest.fn((key, fallback) => fallback || key),
    i18n: { language: 'en' },
  })),
}));

jest.mock('@openmrs/esm-framework', () => ({
  showModal: jest.fn(),
  useConfig: jest.fn(() => ({
    defaultCurrency: 'USD',
    showEditBillButton: true,
  })),
  useDebounce: jest.fn((value) => value),
  useLayoutType: jest.fn(() => 'desktop'),
  isDesktop: jest.fn(() => true),
}));

jest.mock('../helpers', () => ({
  convertToCurrency: jest.fn((price) => `USD ${price}`),
}));

describe('InvoiceTable', () => {
  const mockT = jest.fn((key) => key);

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT, i18n: { language: 'en' } });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const bill: MappedBill = {
    uuid: 'bill-uuid',
    id: 123,
    patientUuid: 'patient-uuid',
    patientName: 'John Doe',
    lineItems: [
      {
        uuid: '1',
        item: 'Item 1',
        paymentStatus: 'PAID',
        quantity: 1,
        price: 100,
        display: '',
        voided: false,
        voidReason: '',
        billableService: '',
        priceName: '',
        priceUuid: '',
        lineItemOrder: 0,
        resourceVersion: '',
      },
      {
        uuid: '2',
        item: 'Item 2',
        paymentStatus: 'PENDING',
        quantity: 2,
        price: 200,
        display: '',
        voided: false,
        voidReason: '',
        billableService: '',
        priceName: '',
        priceUuid: '',
        lineItemOrder: 0,
        resourceVersion: '',
      },
    ],
    receiptNumber: '12345',
    cashPointUuid: 'cash-point-uuid',
    cashPointName: 'Main Cash Point',
    cashPointLocation: 'Front Desk',
    cashier: {
      uuid: 'cashier-uuid',
      display: 'John Doe',
      links: [],
    },
    status: 'PAID',
    identifier: 'receipt-identifier',
    dateCreated: new Date().toISOString(),
    billingService: 'billing-service-uuid',
    payments: [],
    totalAmount: 300,
    tenderedAmount: 300,
  };

  it('renders the table and displays line items correctly', () => {
    render(<InvoiceTable bill={bill} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByTestId('receipt-number-0')).toHaveTextContent('12345');
  });

  it('renders the edit button and calls showModal when clicked', () => {
    render(<InvoiceTable bill={bill} />);

    const editButton = screen.getByTestId('edit-button-1');
    fireEvent.click(editButton);
    expect(showModal).toHaveBeenCalledWith('edit-bill-line-item-dialog', expect.anything());
  });

  it('displays a skeleton loader when the bill is loading', () => {
    render(<InvoiceTable bill={bill} isLoadingBill={true} />);

    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('filters line items based on the search term', () => {
    render(<InvoiceTable bill={bill} />);
    const searchInput = screen.getByPlaceholderText('searchThisTable'); //

    fireEvent.change(searchInput, { target: { value: 'Item 2' } });

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('correctly handles row selection', () => {
    const onSelectItem = jest.fn();
    render(<InvoiceTable bill={bill} onSelectItem={onSelectItem} />);

    const checkboxes = screen.getAllByLabelText('Select row');
    fireEvent.click(checkboxes[0]);

    expect(onSelectItem).toHaveBeenCalledWith([bill.lineItems[0]]);
  });

  it('resets isRedirecting to false after timeout', () => {
    render(<InvoiceTable bill={bill} />);

    const button = screen.getByTestId('edit-button-1');
    fireEvent.click(button);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(button).not.toBeDisabled();
  });
});
