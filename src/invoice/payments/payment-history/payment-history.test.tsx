import React from 'react';
import { render, screen } from '@testing-library/react';
import PaymentHistory from './payment-history.component';
import { useConfig } from '@openmrs/esm-framework';
import { MappedBill } from '../../../types';

// Mocking useConfig to return a default currency
jest.mock('@openmrs/esm-framework', () => ({
  useConfig: jest.fn(),
  formatDate: jest.fn((date) => date.toISOString().split('T')[0]),
}));

jest.mock('../../../helpers', () => ({
  convertToCurrency: jest.fn((amount, currency) => `${currency} ${amount.toFixed(2)}`),
}));

describe('PaymentHistory Component', () => {
  beforeEach(() => {
    (useConfig as jest.Mock).mockReturnValue({
      defaultCurrency: 'USD',
    });
  });

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

  const emptyBill: MappedBill = {
    uuid: 'bill-uuid',
    id: 1,
    patientUuid: 'patient-uuid',
    patientName: 'John Doe',
    cashPointUuid: 'cash-point-uuid',
    cashPointName: 'Main Cash Point',
    cashPointLocation: 'Main Hospital',
    cashier: {
      uuid: 'provider-2',
      display: 'John Smith',
      links: [
        {
          rel: 'self',
          uri: 'http://example.com/provider/2',
          resourceAlias: 'John Smith',
        },
      ],
    },
    payments: [],
    receiptNumber: '12346',
    status: 'PENDING',
    identifier: 'invoice-124',
    dateCreated: '2023-09-02T10:00:00Z',
    lineItems: [],
    billingService: 'Billing Service',
  };

  test('renders without crashing', () => {
    render(<PaymentHistory bill={mockBill} />);
  });

  test('renders correct table headers', () => {
    render(<PaymentHistory bill={mockBill} />);
    expect(screen.getByText('Date of payment')).toBeInTheDocument();
    expect(screen.getByText('Bill amount')).toBeInTheDocument();
    expect(screen.getByText('Amount tendered')).toBeInTheDocument();
    expect(screen.getByText('Payment method')).toBeInTheDocument();
  });

  test('renders the correct number of rows', () => {
    render(<PaymentHistory bill={mockBill} />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
  });

  test('renders correct data in the rows', () => {
    render(<PaymentHistory bill={mockBill} />);

    expect(screen.getByText('2023-09-01')).toBeInTheDocument();
    expect(screen.getByText('USD 80.00')).toBeInTheDocument();
    expect(screen.getByText('USD 100.00')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();

    expect(screen.getByText('2023-09-05')).toBeInTheDocument();
    expect(screen.getByText('USD 180.00')).toBeInTheDocument();
    expect(screen.getByText('USD 200.00')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });

  test('handles empty payments gracefully', () => {
    render(<PaymentHistory bill={emptyBill} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('does not render when bill is undefined', () => {
    render(<PaymentHistory bill={undefined} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('formats dates and converts amounts correctly', () => {
    render(<PaymentHistory bill={mockBill} />);

    expect(screen.getByText('2023-09-01')).toBeInTheDocument();
    expect(screen.getByText('USD 80.00')).toBeInTheDocument();
    expect(screen.getByText('USD 100.00')).toBeInTheDocument();
  });
});
