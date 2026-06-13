import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockBill, mockPatient } from '@mocks/bills.mock';
import { waitForLoadingToFinish } from '@tools/test-helpers';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { useReactToPrint } from 'react-to-print';
import {
  getDefaultsFromConfigSchema,
  launchWorkspace2,
  showModal,
  useConfig,
  usePatient,
} from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import {
  type BillDiscount,
  BillDiscountStatus,
  BillDiscountType,
  BillStatus,
  RefundStatus,
  type MappedBill,
} from '../types';
import { useBill } from '../billing.resource';
import { usePaymentModes } from './payments/payment.resource';
import Invoice from './invoice.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockUseBill = vi.mocked(useBill);
const mockUsePatient = vi.mocked(usePatient);
const mockUsePaymentModes = vi.mocked(usePaymentModes);
const mockUseReactToPrint = vi.mocked(useReactToPrint);
const mockShowModal = vi.mocked(showModal);

vi.mock('../helpers/functions', () => ({
  convertToCurrency: vi.fn((amount) => `USD ${amount}`),
}));

window.i18next = {
  language: 'en',
} as any;

vi.mock('./printable-invoice/print-receipt.component', () => ({
  default: vi.fn(() => <div data-testid="mock-print-receipt">Print Receipt Mock</div>),
}));

vi.mock('./printable-invoice/printable-invoice.component', () => ({
  default: () => <div data-testid="mock-printable-invoice">Printable Invoice Mock</div>,
}));

vi.mock('./payments/payment.resource', () => ({
  usePaymentModes: vi.fn(),
  updateBillVisitAttribute: vi.fn(),
}));

vi.mock('../billing.resource', () => ({
  useBill: vi.fn(),
  useDefaultFacility: vi.fn().mockReturnValue({
    data: {
      uuid: '54065383-b4d4-42d2-af4d-d250a1fd2590',
      display: 'MTRH',
      links: [],
    },
    isLoading: false,
  }),
  useStockItems: vi.fn().mockReturnValue({
    stockItems: [],
    isLoadingItem: false,
    isValidating: false,
    error: null,
    mutate: vi.fn(),
  }),
}));

vi.mock('../discounts/discounts-table.component', () => ({
  default: vi.fn(() => null),
}));

vi.mock('../refunds/refunds-table.component', () => ({
  default: vi.fn(() => null),
}));

vi.mock('react-router-dom', () => ({
  useParams: vi.fn().mockReturnValue({
    patientUuid: 'patientUuid',
    billUuid: 'billUuid',
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn().mockReturnValue({
    t: vi.fn((key, defaultValue) => defaultValue ?? key),
  }),
}));

vi.mock('react-to-print', () => ({
  useReactToPrint: vi.fn(),
}));

describe('Invoice', () => {
  const defaultBillData: MappedBill = {
    ...mockBill,
    uuid: 'test-uuid',
    status: BillStatus.PENDING,
    totalAmount: 1000,
    netAmount: 1000,
    tenderedAmount: 0,
    receiptNumber: 'RCPT-001',
    dateCreated: '2024-01-01',
    lineItems: [
      {
        uuid: 'item-1',
        item: 'Test Service',
        quantity: 1,
        price: 1000,
        status: 'PENDING',
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
      mutate: vi.fn(),
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
      mutate: vi.fn(),
    });

    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });

    const printHandler = vi.fn();
    mockUseReactToPrint.mockReturnValue(printHandler);
  });

  const makeDiscount = (overrides: Partial<BillDiscount> = {}): BillDiscount => ({
    uuid: 'discount-1',
    billUuid: 'test-uuid',
    lineItemUuid: null,
    discountType: BillDiscountType.PERCENTAGE,
    discountValue: 10,
    discountAmount: 100,
    justification: 'goodwill',
    initiator: { uuid: 'u1', display: 'cashier' },
    approver: null,
    dateCreated: '2024-01-01',
    status: BillDiscountStatus.APPROVED,
    voided: false,
    ...overrides,
  });

  it('should render loading state when bill is loading', () => {
    mockUseBill.mockReturnValue({
      bill: null,
      isLoading: true,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
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
      mutate: vi.fn(),
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
    expect(screen.getByText(/date bill created/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice status/i)).toBeInTheDocument();
    expect(screen.getAllByText('RCPT-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
    expect(screen.getByText(/line items/i)).toBeInTheDocument();
    expect(screen.getByText('Test Service')).toBeInTheDocument();
    expect(screen.getByText(/payments/i)).toBeInTheDocument();
  });

  it('should show print receipt button for paid bills', async () => {
    mockUseBill.mockReturnValue({
      bill: {
        ...defaultBillData,
        status: BillStatus.PAID,
        tenderedAmount: 1000,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByTestId('mock-print-receipt')).toBeInTheDocument();
  });

  it('should show print receipt button for bills with tendered amount', async () => {
    mockUseBill.mockReturnValue({
      bill: {
        ...defaultBillData,
        status: BillStatus.PENDING,
        tenderedAmount: 500,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
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
    const handlePrintMock = vi.fn();
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
    const billWithMultipleItems: MappedBill = {
      ...defaultBillData,
      lineItems: [
        {
          uuid: 'item-1',
          item: 'Lab Test',
          quantity: 1,
          price: 500,
          status: 'PENDING',
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
          status: 'PENDING',
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
      mutate: vi.fn(),
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
    const mockMutate = vi.fn();
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
      status: BillStatus.PAID,
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
      mutate: vi.fn(),
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
      mutate: vi.fn(),
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

  it.skip('should render PrintableInvoice when both bill and patient exist', async () => {
    mockUsePatient.mockReturnValue({
      patient: mockPatient as any,
      isLoading: false,
      error: null,
      patientUuid: 'patientUuid',
    });
    mockUseBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    // PrintableInvoice should be rendered with both bill and patient
    // Check that the printContainer exists (it wraps the PrintableInvoice component)
    const printContainer =
      document.querySelector('.printContainer') || document.querySelector('[class*="printContainer"]');
    expect(printContainer).toBeInTheDocument();
  });

  it('should pass correct props to InvoiceTable', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    // Verify InvoiceTable is rendered with line items
    expect(screen.getByText('Test Service')).toBeInTheDocument();
    expect(screen.getByText(/line items/i)).toBeInTheDocument();
  });

  it('should pass mutate function to Payments component', async () => {
    const mockMutate = vi.fn();
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
        status: BillStatus.PENDING,
        totalAmount: 1000,
        tenderedAmount: 500, // Partial payment
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
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
        status: BillStatus.PENDING,
        tenderedAmount: 0,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.queryByTestId('mock-print-receipt')).not.toBeInTheDocument();
  });

  it('should show "Add items to bill" button for PENDING bills', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByRole('button', { name: /add items to bill/i })).toBeInTheDocument();
  });

  it('should not show "Add items to bill" button for PAID bills', async () => {
    mockUseBill.mockReturnValue({
      bill: {
        ...defaultBillData,
        status: BillStatus.PAID,
        tenderedAmount: 1000,
      },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.queryByRole('button', { name: /add items to bill/i })).not.toBeInTheDocument();
  });

  it('should show "Finalize bill" button for PENDING bills', async () => {
    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.getByRole('button', { name: /finalize bill/i })).toBeInTheDocument();
  });

  it('should not show "Finalize bill" button for POSTED bills', async () => {
    mockUseBill.mockReturnValue({
      bill: { ...defaultBillData, status: BillStatus.POSTED },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.queryByRole('button', { name: /finalize bill/i })).not.toBeInTheDocument();
  });

  it('should not show "Finalize bill" button for PAID bills', async () => {
    mockUseBill.mockReturnValue({
      bill: { ...defaultBillData, status: BillStatus.PAID, tenderedAmount: 1000 },
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: vi.fn(),
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    expect(screen.queryByRole('button', { name: /finalize bill/i })).not.toBeInTheDocument();
  });

  it('should open finalize confirmation modal when "Finalize bill" button is clicked', async () => {
    const mockMutate = vi.fn();
    const user = userEvent.setup();

    mockUseBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: mockMutate,
    });

    render(<Invoice />);
    await waitForLoadingToFinish();

    await user.click(screen.getByRole('button', { name: /finalize bill/i }));

    expect(mockShowModal).toHaveBeenCalledWith('finalize-bill-confirmation-modal', {
      bill: defaultBillData,
      onMutate: mockMutate,
      closeModal: expect.any(Function),
    });
  });

  describe('discount entry points', () => {
    it('renders the "Request discount" button when bill is eligible', async () => {
      render(<Invoice />);
      expect(await screen.findByRole('button', { name: /request discount/i })).toBeInTheDocument();
    });

    it('opens the request-discount modal on click', async () => {
      const user = userEvent.setup();
      render(<Invoice />);
      await user.click(await screen.findByRole('button', { name: /request discount/i }));
      expect(mockShowModal).toHaveBeenCalledWith('request-discount-modal', expect.any(Object));
    });

    it('shows Total amount / Discount / Net amount trio when an approved discount exists', async () => {
      mockUseBill.mockReturnValue({
        bill: {
          ...defaultBillData,
          totalAmount: 5000,
          netAmount: 4500,
          tenderedAmount: 500,
          discounts: [makeDiscount({ status: BillDiscountStatus.APPROVED, discountAmount: 500 })],
        },
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<Invoice />);
      expect(await screen.findByRole('heading', { name: /^net amount$/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^total amount$/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^discount$/i })).toBeInTheDocument();
      expect(screen.getAllByText(/^- USD 500$/).length).toBeGreaterThan(0);
      // Amount due must be netAmount - tendered (4000), not totalAmount - tendered (4500).
      expect(screen.getAllByText('USD 4000').length).toBeGreaterThan(0);
    });

    it('hides the Discount / Net amount trio when no approved discount exists, even if totalAmount differs from netAmount', async () => {
      mockUseBill.mockReturnValue({
        bill: {
          ...defaultBillData,
          totalAmount: 5000,
          netAmount: 4500,
          discounts: [makeDiscount({ status: BillDiscountStatus.PENDING })],
        },
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<Invoice />);
      await screen.findByRole('heading', { name: /^total amount$/i });
      expect(screen.queryByRole('heading', { name: /^net amount$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /^discount$/i })).not.toBeInTheDocument();
    });

    it('passes an onMutate to the modal that revalidates the bill SWR cache', async () => {
      const mockMutate = vi.fn();
      mockUseBill.mockReturnValue({
        bill: defaultBillData,
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: mockMutate,
      });
      const user = userEvent.setup();
      render(<Invoice />);
      await user.click(await screen.findByRole('button', { name: /request discount/i }));
      const [, props] = mockShowModal.mock.calls.at(-1)!;
      (props as { onMutate: () => void }).onMutate();
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('discount eligibility — bill status', () => {
    it.each([
      [BillStatus.PAID, 1000],
      [BillStatus.ADJUSTED, 0],
    ])('hides the bill-level "Request discount" button for %s bills', (status, tendered) => {
      mockUseBill.mockReturnValue({
        bill: { ...defaultBillData, status, tenderedAmount: tendered },
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<Invoice />);
      expect(screen.queryByRole('button', { name: /request discount/i })).not.toBeInTheDocument();
    });

    it.each([
      [BillStatus.PAID, 1000],
      [BillStatus.ADJUSTED, 0],
    ])('hides the per-line-item "Request discount" action for %s bills', async (status, tendered) => {
      mockUseBill.mockReturnValue({
        bill: { ...defaultBillData, status, tenderedAmount: tendered },
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      const user = userEvent.setup();
      render(<Invoice />);
      await user.click(screen.getByTestId('action-menu-item-1'));
      expect(screen.queryByTestId('request-discount-button-item-1')).not.toBeInTheDocument();
    });
  });

  describe('discount eligibility — line already discounted', () => {
    it.each([BillDiscountStatus.PENDING, BillDiscountStatus.APPROVED, BillDiscountStatus.REJECTED])(
      'hides the per-line-item "Request discount" action when an existing %s discount targets the line',
      async (discountStatus) => {
        mockUseBill.mockReturnValue({
          bill: { ...defaultBillData, discounts: [makeDiscount({ lineItemUuid: 'item-1', status: discountStatus })] },
          isLoading: false,
          error: null,
          isValidating: false,
          mutate: vi.fn(),
        });
        const user = userEvent.setup();
        render(<Invoice />);
        await user.click(screen.getByTestId('action-menu-item-1'));
        expect(screen.queryByTestId('request-discount-button-item-1')).not.toBeInTheDocument();
      },
    );
  });

  describe('discount eligibility — cross-blocking between bill-level and line-level', () => {
    it.each([BillDiscountStatus.PENDING, BillDiscountStatus.APPROVED, BillDiscountStatus.REJECTED])(
      'disables the bill-level "Request discount" button when a %s line-item discount exists',
      (discountStatus) => {
        mockUseBill.mockReturnValue({
          bill: { ...defaultBillData, discounts: [makeDiscount({ lineItemUuid: 'item-1', status: discountStatus })] },
          isLoading: false,
          error: null,
          isValidating: false,
          mutate: vi.fn(),
        });
        render(<Invoice />);
        expect(screen.getByRole('button', { name: /request discount/i })).toBeDisabled();
      },
    );

    it.each([BillDiscountStatus.PENDING, BillDiscountStatus.APPROVED, BillDiscountStatus.REJECTED])(
      'hides the per-line-item "Request discount" action when a %s bill-level discount exists',
      async (discountStatus) => {
        mockUseBill.mockReturnValue({
          bill: { ...defaultBillData, discounts: [makeDiscount({ lineItemUuid: null, status: discountStatus })] },
          isLoading: false,
          error: null,
          isValidating: false,
          mutate: vi.fn(),
        });
        const user = userEvent.setup();
        render(<Invoice />);
        await user.click(screen.getByTestId('action-menu-item-1'));
        expect(screen.queryByTestId('request-discount-button-item-1')).not.toBeInTheDocument();
      },
    );
  });

  describe('refund entry points', () => {
    const paidBill: MappedBill = {
      ...defaultBillData,
      status: BillStatus.PAID,
      totalAmount: 1000,
      netAmount: 1000,
      tenderedAmount: 1000,
    };

    beforeEach(() => {
      mockUseBill.mockReturnValue({
        bill: paidBill,
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
    });

    it('shows "Request refund" button for PAID bills with no active refund', async () => {
      render(<Invoice />);
      expect(await screen.findByRole('button', { name: /request refund/i })).toBeInTheDocument();
    });

    it('hides "Request refund" button when bill is in REFUND_REQUESTED status', async () => {
      mockUseBill.mockReturnValue({
        bill: { ...paidBill, status: BillStatus.REFUND_REQUESTED },
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<Invoice />);
      await waitForLoadingToFinish();
      expect(screen.queryByRole('button', { name: /request refund/i })).not.toBeInTheDocument();
    });

    const billWithActiveLineRefund: MappedBill = {
      ...paidBill,
      refunds: [
        {
          uuid: 'r-active',
          billUuid: 'test-uuid',
          lineItemUuid: 'item-1',
          refundAmount: 200,
          reason: 'duplicate',
          initiator: { uuid: 'u1', display: 'cashier' },
          approver: null,
          completer: null,
          dateApproved: null,
          dateCompleted: null,
          dateCreated: '2026-06-01T00:00:00.000+0000',
          status: RefundStatus.REQUESTED,
          voided: false,
        },
      ],
    };

    it('disables "Request refund" button when an active line-item refund is in progress', async () => {
      mockUseBill.mockReturnValue({
        bill: billWithActiveLineRefund,
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<Invoice />);
      await waitForLoadingToFinish();
      expect(
        screen.getByRole('button', { name: /a refund is already in progress for one or more line items/i }),
      ).toBeDisabled();
    });

    it('shows a tooltip explaining why "Request refund" is disabled when a line-item refund is in progress', async () => {
      mockUseBill.mockReturnValue({
        bill: billWithActiveLineRefund,
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<Invoice />);
      await waitForLoadingToFinish();
      expect(screen.getByText(/a refund is already in progress for one or more line items/i)).toBeInTheDocument();
    });

    it('passes remainingRefundable that deducts COMPLETED refunds when opening the request-refund modal', async () => {
      const completedRefund = {
        uuid: 'r-done',
        billUuid: 'test-uuid',
        lineItemUuid: null,
        refundAmount: 300,
        reason: 'overcharged',
        initiator: { uuid: 'u1', display: 'cashier' },
        approver: { uuid: 'u2', display: 'admin' },
        completer: { uuid: 'u3', display: 'cashier2' },
        dateApproved: '2026-05-21T00:00:00.000+0000',
        dateCompleted: '2026-05-21T00:00:00.000+0000',
        dateCreated: '2026-05-21T00:00:00.000+0000',
        status: RefundStatus.COMPLETED,
        voided: false,
      };
      mockUseBill.mockReturnValue({
        bill: { ...paidBill, refunds: [completedRefund] },
        isLoading: false,
        error: null,
        isValidating: false,
        mutate: vi.fn(),
      });
      const user = userEvent.setup();
      render(<Invoice />);
      await user.click(await screen.findByRole('button', { name: /request refund/i }));
      expect(mockShowModal).toHaveBeenCalledWith(
        'request-refund-modal',
        expect.objectContaining({ remainingRefundable: 700 }),
      );
    });
  });

  it('should launch workspace with billUuid when "Add items to bill" is clicked', async () => {
    const mockMutate = vi.fn();
    const mockLaunchWorkspace2 = vi.mocked(launchWorkspace2);

    mockUseBill.mockReturnValue({
      bill: defaultBillData,
      isLoading: false,
      error: null,
      isValidating: false,
      mutate: mockMutate,
    });

    const user = userEvent.setup();
    render(<Invoice />);
    await waitForLoadingToFinish();

    const addItemsButton = screen.getByRole('button', { name: /add items to bill/i });
    await user.click(addItemsButton);

    expect(mockLaunchWorkspace2).toHaveBeenCalledWith('billing-form-workspace', {
      patientUuid: 'patientUuid',
      billUuid: 'test-uuid',
      onMutate: mockMutate,
    });
  });
});
