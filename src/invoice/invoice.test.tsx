import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReactToPrint } from 'react-to-print';
import { showSnackbar } from '@openmrs/esm-framework';
import { mockPayments, mockBill } from '../../__mocks__/bills.mock';
import { useBill, processBillPayment } from '../billing.resource';
import { usePaymentModes } from './payments/payment.resource';
import Invoice from './invoice.component';

const mockedBill = jest.mocked(useBill);
const mockedProcessBillPayment = jest.mocked(processBillPayment);
const mockedUsePaymentModes = jest.mocked(usePaymentModes);
const mockedUseReactToPrint = jest.mocked(useReactToPrint);

jest.mock('./payments/payment.resource', () => ({
  usePaymentModes: jest.fn(),
  updateBillVisitAttribute: jest.fn(),
}));

jest.mock('../billing.resource', () => ({
  useBill: jest.fn(),
  processBillPayment: jest.fn(),
  useDefaultFacility: jest.fn().mockReturnValue({ uuid: '54065383-b4d4-42d2-af4d-d250a1fd2590', display: 'MTRH' }),
}));

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn().mockReturnValue({ patientUuid: 'patientUuid', billUuid: 'billUuid' }),
  };
});

jest.mock('react-to-print', () => {
  const originalModule = jest.requireActual('react-to-print');

  return {
    ...originalModule,
    useReactToPrint: jest.fn(),
  };
});

jest.mock('@openmrs/esm-framework', () => {
  const originalModule = jest.requireActual('@openmrs/esm-framework');

  return {
    ...originalModule,
    usePatient: jest.fn().mockReturnValue({
      patient: {
        id: 'b2fcf02b-7ee3-4d16-a48f-576be2b103aa',
        name: [{ given: ['John'], family: 'Doe' }],
      },
      patientUuid: 'b2fcf02b-7ee3-4d16-a48f-576be2b103aa',
      isLoading: false,
      error: null,
    }),
  };
});

xdescribe('Invoice', () => {
  beforeEach(() => {
    mockedBill.mockReturnValue({
      bill: mockBill,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    mockedUsePaymentModes.mockReturnValue({
      paymentModes: [
        { uuid: 'uuid', name: 'Cash', description: 'Cash Method', retired: false },
        { uuid: 'uuid1', name: 'MPESA', description: 'MPESA Method', retired: false },
      ],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });
  });

  afterEach(() => jest.clearAllMocks());

  test('should be able to search through the invoice table and settle a bill', async () => {
    const user = userEvent.setup();

    renderInvoice();

    const expectedHeaders = [
      /Total amount/i,
      /Amount tendered/i,
      /Date and time/i,
      /Invoice status/i,
      /Invoice number/i,
    ];

    expectedHeaders.forEach((header) => {
      expect(screen.getByRole('heading', { name: header })).toBeInTheDocument();
    });

    const printButton = screen.getByRole('button', { name: /Print bill/i });
    expect(printButton).toBeInTheDocument();

    // Should show the line items table with the correct headers
    const expectedColumnHeaders = [/No/i, /Bill item/i, /Bill code/i, /Status/i, /Quantity/i, /Price/i, /Total/i];

    expectedColumnHeaders.forEach((columnHeader) => {
      expect(screen.getByRole('columnheader', { name: columnHeader })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /Line items/i })).toBeInTheDocument();
    expect(screen.getByText(/Items to be billed/i)).toBeInTheDocument();

    // Should be able to search the line items table
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
    await user.type(searchInput, 'Hemoglobin');
    expect(screen.getByText('Hemoglobin')).toBeInTheDocument();

    await user.type(searchInput, 'Some random text');
    expect(screen.queryByText('Hemoglobin')).not.toBeInTheDocument();
    expect(screen.getByText(/No matching items to display/i)).toBeInTheDocument();
    await user.clear(searchInput);

    const row = mockBill.lineItems[0].item + ' ' + mockBill.receiptNumber + ' ' + mockBill.status.toUpperCase();

    expect(screen.getByRole('row', { name: new RegExp(row, 'i') })).toBeInTheDocument();

    // should be able to handle payments
    const paymentSection = await screen.findByRole('heading', { name: /Payments/i });
    expect(paymentSection).toBeInTheDocument();

    const addPaymentOptionButton = await screen.findByRole('button', { name: /Add payment option/i });
    expect(addPaymentOptionButton).toBeInTheDocument();
    await user.click(addPaymentOptionButton);
    const paymentModeInput = screen.getByRole('combobox', { name: /Payment method/i });
    expect(paymentModeInput).toBeInTheDocument();
    await user.click(paymentModeInput);

    // select cash payment mode
    const cashPaymentMode = await screen.findByText('Cash');
    expect(cashPaymentMode).toBeInTheDocument();
    await user.click(cashPaymentMode);

    // enter payment amount
    const paymentAmountInput = screen.getByPlaceholderText('Enter amount');
    expect(paymentAmountInput).toBeInTheDocument();
    await user.type(paymentAmountInput, '100');

    // enter payment reference number
    const paymentReferenceNumberInput = screen.getByRole('textbox', { name: /Reference number/ });
    expect(paymentReferenceNumberInput).toBeInTheDocument();
    await user.type(paymentReferenceNumberInput, '123456');

    expect(addPaymentOptionButton).toBeDisabled();

    // should process payment
    mockedProcessBillPayment.mockResolvedValueOnce(Promise.resolve({} as any));
    const processPaymentButton = screen.getByRole('button', { name: /Process Payment/i });
    expect(processPaymentButton).toBeInTheDocument();
    await user.click(processPaymentButton);

    expect(processBillPayment).toHaveBeenCalledTimes(1);
    expect(processBillPayment).toHaveBeenCalledWith(
      {
        cashPoint: '54065383-b4d4-42d2-af4d-d250a1fd2590',
        cashier: 'fe00dd43-4c39-4ce9-9832-bc3620c80c6c',
        patient: 'b2fcf02b-7ee3-4d16-a48f-576be2b103aa',
        payments: [{ amount: 100, amountTendered: 100, attributes: [], instanceType: 'uuid' }],
        status: 'PAID',
      },
      '6eb8d678-514d-46ad-9554-51e48d96d567',
    );
    expect(showSnackbar).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith({
      kind: 'success',
      subtitle: 'Bill payment processing has been successful',
      timeoutInMs: 3000,
      title: 'Bill payment',
    });
  });

  test('should show print preview when print button is clicked', async () => {
    const user = userEvent.setup();

    renderInvoice();

    const printButton = screen.getByRole('button', { name: /Print bill/i });
    expect(printButton).toBeInTheDocument();
    await user.click(printButton);
    expect(mockedUseReactToPrint).toHaveBeenCalledTimes(1);
    expect(mockedUseReactToPrint).toHaveBeenCalledWith(
      expect.objectContaining({
        documentTitle: 'Invoice 0035-6 - John Doe',
      }),
    );
  });

  test('should show payment history if bill is paid and disable adding more payments', async () => {
    const user = userEvent.setup();
    mockedBill.mockReturnValue({
      bill: {
        ...mockBill,
        status: 'PAID',
        payments: mockPayments,
        tenderedAmount: 100,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: jest.fn(),
    });

    mockedUsePaymentModes.mockReturnValue({
      paymentModes: [
        { uuid: 'uuid', name: 'Cash', description: 'Cash Method', retired: false },
        { uuid: 'uuid1', name: 'MPESA', description: 'MPESA Method', retired: false },
      ],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    renderInvoice();
    const paymentHistorySection = screen.getByRole('heading', { name: /Payments/i });
    expect(paymentHistorySection).toBeInTheDocument();

    const expectedColumnHeaders = [/Date of payment/, /Bill amount/, /Amount tendered/, /Payment method/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeInTheDocument();
    });

    const addPaymentOptionButton = await screen.findByRole('button', { name: /Add payment option/i });
    expect(addPaymentOptionButton).toBeInTheDocument();
    expect(addPaymentOptionButton).toBeDisabled();
  });
});

function renderInvoice() {
  return render(<Invoice />);
}
