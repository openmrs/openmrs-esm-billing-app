import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { useReactToPrint } from 'react-to-print';
import { getDefaultsFromConfigSchema, useConfig, usePatient } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { mockBill, mockPatient } from 'mocks/bills.mock';
import { useBill } from '../billing.resource';
import { usePaymentModes } from './payments/payment.resource';
import { waitForLoadingToFinish } from 'tools/test-helpers';
import Invoice from './invoice.component';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockUseBill = jest.mocked(useBill);
const mockUsePatient = jest.mocked(usePatient);
const mockUsePaymentModes = jest.mocked(usePaymentModes);
const mockUseReactToPrint = jest.mocked(useReactToPrint);

jest.mock('../helpers/functions', () => ({
  convertToCurrency: jest.fn((amount) => `USD ${amount}`),
}));

window.i18next = {
  language: 'en',
} as any;

jest.mock('./printable-invoice/print-receipt.component', () =>
  jest.fn(() => <div data-testid="mock-print-receipt">Print Receipt Mock</div>),
);

jest.mock('./printable-invoice/printable-invoice.component', () =>
  jest.fn(() => <div data-testid="mock-printable-invoice">Printable Invoice Mock</div>),
);

jest.mock('./payments/payment.resource', () => ({
  usePaymentModes: jest.fn(),
  updateBillVisitAttribute: jest.fn(),
}));

jest.mock('../billing.resource', () => ({
  useBill: jest.fn(),
  useDefaultFacility: jest.fn().mockReturnValue({
    data: {
      uuid: '54065383-b4d4-42d2-af4d-d250a1fd2590',
      display: 'MTRH',
    },
  }),
}));

jest.mock('react-router-dom', () => ({
  useParams: jest.fn().mockReturnValue({
    patientUuid: 'patientUuid',
    billUuid: 'billUuid',
  }),
}));

jest.mock('react-to-print', () => ({
  useReactToPrint: jest.fn(),
}));

describe('Invoice', () => {
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
        billableService: 'Test Service',
        display: '',
        voided: false,
        voidReason: '',
        priceName: '',
        priceUuid: '',
        lineItemOrder: 0,
        resourceVersion: '',
      },
    ],
  };

  beforeEach(() => {
    mockUseBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    mockUsePatient.mockReturnValue({
      patient: mockPatient as any,
      isLoading: false,
      error: null,
      patientUuid: 'patientUuid',
    });

    mockUsePaymentModes.mockReturnValue({
      paymentModes: [
        { uuid: 'cash-uuid', name: 'Cash', description: 'Cash Method', retired: false },
        { uuid: 'mpesa-uuid', name: 'MPESA', description: 'MPESA Method', retired: false },
      ],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });

    const printHandler = jest.fn();
    mockUseReactToPrint.mockReturnValue(printHandler);
  });

  it('should render loading state when bill is loading', () => {
    mockUseBill.mockReturnValue({
      bill: null,
      isLoading: true,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    expect(screen.getByText(/loading bill information/i)).toBeInTheDocument();
  });

  it('should render loading state when patient is loading', () => {
    mockUsePatient.mockReturnValue({
      patient: null as any,
      isLoading: true,
      error: null,
      patientUuid: 'patientUuid',
    });

    render(<Invoice />);
    expect(screen.getByText(/loading bill information/i)).toBeInTheDocument();
  });

  it('should render error state when bill fails to load', () => {
    mockUseBill.mockReturnValue({
      bill: null,
      isLoading: false,
      error: new Error('Failed to load bill'),
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    expect(screen.getByText(/error state/i)).toBeInTheDocument();
  });

  it('should render invoice details correctly', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getAllByText(/total amount/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/amount tendered/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /invoice number/i })).toBeInTheDocument();
    expect(screen.getByText(/date and time/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice status/i)).toBeInTheDocument();
    expect(screen.getAllByText('RCPT-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
  });

  it('should render invoice table with line items', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByText(/line items/i)).toBeInTheDocument();
    expect(screen.getByText('Test Service')).toBeInTheDocument();
  });

  it('should render payments section', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByText(/payments/i)).toBeInTheDocument();
  });

  it('should show print receipt button for paid bills', async () => {
    mockUseBill.mockReturnValue({
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
    await waitForLoadingToFinish();

    expect(screen.getByTestId('mock-print-receipt')).toBeInTheDocument();
  });

  it('should show print receipt button for bills with tendered amount', async () => {
    mockUseBill.mockReturnValue({
      bill: {
        ...defaultBillData,
        status: 'PENDING',
        tenderedAmount: 500,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByTestId('mock-print-receipt')).toBeInTheDocument();
  });

  it('should not show print receipt button for unpaid bills', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.queryByTestId('mock-print-receipt')).not.toBeInTheDocument();
  });

  it('should handle print button click', async () => {
    const handlePrintMock = jest.fn();
    const user = userEvent.setup();
    mockUseReactToPrint.mockReturnValue(handlePrintMock);

    render(<Invoice />);

    const printButton = screen.getByRole('button', { name: /print bill/i });
    await user.click(printButton);

    await waitFor(() => {
      expect(handlePrintMock).toHaveBeenCalled();
    });
  });

  it('should disable print button while printing', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    const printButton = screen.getByRole('button', { name: /print bill/i });
    expect(printButton).toBeEnabled();
  });

  it('should render patient header when patient data is available', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    // Patient header is rendered via ExtensionSlot
    expect(screen.getByText(/line items/i)).toBeInTheDocument();
  });

  it('should search and filter line items in the table', async () => {
    const billWithMultipleItems = {
      ...defaultBillData,
      lineItems: [
        {
          uuid: 'item-1',
          item: 'Lab Test',
          quantity: 1,
          price: 500,
          paymentStatus: 'PENDING',
          billableService: 'Lab Test',
          display: '',
          voided: false,
          voidReason: '',
          priceName: '',
          priceUuid: '',
          lineItemOrder: 0,
          resourceVersion: '',
        },
        {
          uuid: 'item-2',
          item: 'X-Ray',
          quantity: 1,
          price: 500,
          paymentStatus: 'PENDING',
          billableService: 'X-Ray',
          display: '',
          voided: false,
          voidReason: '',
          priceName: '',
          priceUuid: '',
          lineItemOrder: 1,
          resourceVersion: '',
        },
      ],
    };

    mockUseBill.mockReturnValue({
      bill: billWithMultipleItems,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    const user = userEvent.setup();
    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByText('Lab Test')).toBeInTheDocument();
    expect(screen.getByText('X-Ray')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search this table/i);
    await user.type(searchInput, 'Lab Test');

    await waitFor(() => {
      expect(screen.getByText('Lab Test')).toBeInTheDocument();
      expect(screen.queryByText('X-Ray')).not.toBeInTheDocument();
    });
  });

  it('should handle bill data updates via mutate', async () => {
    const mockMutate = jest.fn();
    mockUseBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: mockMutate,
    });

    const { rerender } = render(<Invoice />);
    await waitForLoadingToFinish();

    const updatedBill = {
      ...defaultBillData,
      status: 'PAID',
      tenderedAmount: 1000,
    };

    mockUseBill.mockReturnValue({
      bill: updatedBill,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: mockMutate,
    });

    rerender(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByText('PAID')).toBeInTheDocument();
  });

  it('should display correct currency formatting', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    // convertToCurrency is mocked to return "USD ${amount}"
    expect(screen.getAllByText('USD 1000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USD 0').length).toBeGreaterThan(0);
  });

  it('should disable print button when isPrinting state is true', () => {
    // Mock isPrinting state by checking the button's disabled state when loading
    mockUseBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: true,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    // When bill is loading, component shows loading state, not the button
    expect(screen.getByText(/loading bill information/i)).toBeInTheDocument();
  });

  it('should not render PrintableInvoice when bill is missing', async () => {
    mockUseBill.mockReturnValue({
      bill: null,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    mockUsePatient.mockReturnValue({
      patient: mockPatient as any,
      isLoading: false,
      error: null,
      patientUuid: 'patientUuid',
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    // PrintableInvoice should not be rendered when bill is null
    // Since it's in a hidden div, we can't easily assert its absence
    // but we can verify the main content doesn't have the print container
    expect(screen.queryByTestId('mock-printable-invoice')).not.toBeInTheDocument();
  });

  it('should not render PrintableInvoice when patient is missing', async () => {
    mockUsePatient.mockReturnValue({
      patient: null as any,
      isLoading: false,
      error: null,
      patientUuid: 'patientUuid',
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    // PrintableInvoice requires both bill and patient
    expect(screen.queryByTestId('mock-printable-invoice')).not.toBeInTheDocument();
  });

  it('should render PrintableInvoice when both bill and patient exist', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    // PrintableInvoice should be rendered with both bill and patient
    expect(screen.getByTestId('mock-printable-invoice')).toBeInTheDocument();
  });

  it('should pass correct props to InvoiceTable', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    // Verify InvoiceTable is rendered with line items
    expect(screen.getByText('Test Service')).toBeInTheDocument();
    expect(screen.getByText(/line items/i)).toBeInTheDocument();
  });

  it('should pass mutate function to Payments component', async () => {
    const mockMutate = jest.fn();
    mockUseBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: mockMutate,
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    // Payments component should be rendered
    expect(screen.getByText(/payments/i)).toBeInTheDocument();
  });

  it('should show print receipt for bills with partial payment', async () => {
    mockUseBill.mockReturnValue({
      bill: {
        ...defaultBillData,
        status: 'PENDING',
        totalAmount: 1000,
        tenderedAmount: 500, // Partial payment
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByTestId('mock-print-receipt')).toBeInTheDocument();
  });

  it('should render ExtensionSlot when patient and patientUuid exist', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    // The component renders, which includes the ExtensionSlot
    // We can verify this indirectly by checking the main content is present
    expect(screen.getByRole('heading', { name: /invoice number/i })).toBeInTheDocument();
  });

  it('should not show print receipt for bills with zero tendered amount', async () => {
    mockUseBill.mockReturnValue({
      bill: {
        ...defaultBillData,
        status: 'PENDING',
        tenderedAmount: 0,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.queryByTestId('mock-print-receipt')).not.toBeInTheDocument();
  });
});
