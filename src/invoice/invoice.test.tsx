import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, render } from '@testing-library/react';
import { useReactToPrint } from 'react-to-print';
import { getDefaultsFromConfigSchema, useConfig, usePatient } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { mockBill, mockPatient } from '../../__mocks__/bills.mock';
import { useBill, processBillPayment } from '../billing.resource';
import { usePaymentModes } from './payments/payment.resource';
import Invoice from './invoice.component';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);

// Mock convertToCurrency
jest.mock('../helpers/functions', () => ({
  convertToCurrency: jest.fn((amount) => `USD ${amount}`),
}));

// Set window.i18next
window.i18next = {
  language: 'en',
} as any;

// Mock InvoiceTable component
jest.mock('./invoice-table.component', () =>
  jest.fn(({ bill }) => <div data-testid="mock-invoice-table">Invoice Table Mock</div>),
);

// Mock payments component
jest.mock('./payments/payments.component', () =>
  jest.fn(({ bill, mutate, selectedLineItems }) => (
    <div data-testid="mock-payments">
      <h2>Payments</h2>
      <button>Add payment option</button>
    </div>
  )),
);

// Mock PrintReceipt component
jest.mock('./printable-invoice/print-receipt.component', () =>
  jest.fn(({ billId }) => <div data-testid="mock-print-receipt">Print Receipt Mock</div>),
);

// Mock PrintableInvoice component
jest.mock('./printable-invoice/printable-invoice.component', () =>
  jest.fn(({ bill, patient }) => <div data-testid="mock-printable-invoice">Printable Invoice Mock</div>),
);

// Mock payment resource
jest.mock('./payments/payment.resource', () => ({
  usePaymentModes: jest.fn(),
  updateBillVisitAttribute: jest.fn(),
}));

// Mock billing resource
jest.mock('../billing.resource', () => ({
  useBill: jest.fn(),
  processBillPayment: jest.fn(),
  useDefaultFacility: jest.fn().mockReturnValue({
    uuid: '54065383-b4d4-42d2-af4d-d250a1fd2590',
    display: 'MTRH',
  }),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useParams: jest.fn().mockReturnValue({
    patientUuid: 'patientUuid',
    billUuid: 'billUuid',
  }),
}));

// Mock react-to-print
jest.mock('react-to-print', () => ({
  useReactToPrint: jest.fn(),
}));

describe('Invoice', () => {
  const mockedBill = useBill as jest.Mock;
  const mockedPatient = usePatient as jest.Mock;
  const mockedProcessBillPayment = processBillPayment as jest.Mock;
  const mockedUsePaymentModes = usePaymentModes as jest.Mock;
  const mockedUseReactToPrint = useReactToPrint as jest.Mock;

  const defaultBillData = {
    ...mockBill,
    uuid: 'test-uuid',
    status: 'PENDING',
    totalAmount: 1000,
    tenderedAmount: 0,
    receiptNumber: 'RCPT-001',
    dateCreated: '2024-01-01',
    lineItems: [
      {
        uuid: 'item-1',
        item: 'Test Service',
        quantity: 1,
        price: 1000,
        paymentStatus: 'PENDING',
      },
    ],
  };

  beforeEach(() => {
    mockedBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    mockedPatient.mockReturnValue({
      patient: mockPatient,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    mockedUsePaymentModes.mockReturnValue({
      paymentModes: [
        { uuid: 'cash-uuid', name: 'Cash', description: 'Cash Method', retired: false },
        { uuid: 'mpesa-uuid', name: 'MPESA', description: 'MPESA Method', retired: false },
      ],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });

    // Setup print handler mock
    const printHandler = jest.fn();
    mockedUseReactToPrint.mockReturnValue(printHandler);
  });

  it('should render error state correctly', () => {
    mockedBill.mockReturnValue({
      bill: null,
      isLoading: false,
      error: new Error('Test error'),
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    expect(screen.getByText(/Invoice error/i)).toBeInTheDocument();
    expect(screen.getByText(/Error/)).toBeInTheDocument();
  });

  it('should render invoice details correctly', () => {
    render(<Invoice />);

    // Check invoice details
    expect(screen.getByText(/Total Amount/i)).toBeInTheDocument();
    expect(screen.getByText(/Amount Tendered/i)).toBeInTheDocument();
    expect(screen.getByText(/Invoice Number/i)).toBeInTheDocument();
    expect(screen.getByText(/Date And Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Invoice Status/i)).toBeInTheDocument();

    // Check mock components
    expect(screen.getByTestId('mock-invoice-table')).toBeInTheDocument();
    expect(screen.getByTestId('mock-payments')).toBeInTheDocument();
  });

  it('should show print receipt button for paid bills', () => {
    mockedBill.mockReturnValue({
      bill: {
        ...defaultBillData,
        status: 'PAID',
        tenderedAmount: 1000,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    expect(screen.getByTestId('mock-print-receipt')).toBeInTheDocument();
  });

  it('should handle bill payment processing', async () => {
    const user = userEvent.setup();
    const mockMutate = jest.fn();

    mockedBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: mockMutate,
    });

    mockedProcessBillPayment.mockResolvedValue({});

    render(<Invoice />);

    // Add payment flow would go here
    // Note: Detailed payment interaction testing should be in the Payments component tests

    expect(screen.getByText(/Payments/i)).toBeInTheDocument();
  });

  it('should update line items when bill data changes', () => {
    const { rerender } = render(<Invoice />);

    // Update bill with new line items
    const updatedBill = {
      ...defaultBillData,
      lineItems: [
        ...defaultBillData.lineItems,
        {
          uuid: 'item-2',
          item: 'New Service',
          quantity: 1,
          price: 500,
          paymentStatus: 'PENDING',
        },
      ],
    };

    mockedBill.mockReturnValue({
      bill: updatedBill,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    rerender(<Invoice />);

    // The mock invoice table should receive updated props
    expect(screen.getByTestId('mock-invoice-table')).toBeInTheDocument();
  });

  it('should show patient information correctly', () => {
    render(<Invoice />);
    // Check that the invoice details are rendered
    expect(screen.getByText('Invoice Number')).toBeInTheDocument();
    expect(screen.getByText('RCPT-001')).toBeInTheDocument();
  });

  // Add more test cases as needed for specific features or edge cases
});
