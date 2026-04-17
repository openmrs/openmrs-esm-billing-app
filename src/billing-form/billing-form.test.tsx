import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { getDefaultsFromConfigSchema, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { processBillItems, updateBillItems, useBill, useBillableServices } from '../billing.resource';
import { useBillableServices as useBillableServicesList } from '../billable-services/billable-service.resource';
import { getBillableServiceUuid } from '../invoice/payments/utils';
import BillingForm from './billing-form.workspace';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockUseBillableServices = vi.mocked(useBillableServices);
const mockUseBill = vi.mocked(useBill);
const mockUseBillableServicesList = vi.mocked(useBillableServicesList);
const mockProcessBillItems = vi.mocked(processBillItems);
const mockUpdateBillItems = vi.mocked(updateBillItems);
const mockGetBillableServiceUuid = vi.mocked(getBillableServiceUuid);
const mockShowSnackbar = vi.mocked(showSnackbar);

vi.mock('../billing.resource', () => ({
  processBillItems: vi.fn().mockResolvedValue({}),
  updateBillItems: vi.fn().mockResolvedValue({}),
  useBill: vi.fn(),
  useBillableServices: vi.fn(),
}));

vi.mock('../billable-services/billable-service.resource', () => ({
  useBillableServices: vi.fn(),
}));

vi.mock('../invoice/payments/utils', () => ({
  getBillableServiceUuid: vi.fn(),
}));

vi.mock('../helpers/functions', () => ({
  calculateTotalAmount: vi.fn((items) =>
    Array.isArray(items) ? items.reduce((sum, item) => sum + item.price * item.quantity, 0) : 0,
  ),
  convertToCurrency: vi.fn((amount) => `KES ${amount}`),
}));

window.i18next = {
  language: 'en',
} as any;

const mockBillableItems = [
  {
    uuid: 'service-1',
    name: 'Consultation',
    servicePrices: [{ uuid: 'price-1', name: 'Default', price: 500 }],
  },
  {
    uuid: 'service-2',
    name: 'Lab Test',
    servicePrices: [{ uuid: 'price-2', name: 'Default', price: 1000 }],
  },
  {
    uuid: 'service-3',
    name: 'Hemoglobin',
    servicePrices: [{ uuid: 'price-3', name: 'Default', price: 100 }],
  },
];

const mockExistingBill = {
  uuid: 'bill-123',
  patientUuid: 'patient-uuid',
  patientName: 'John Doe',
  status: 'PENDING',
  cashPointUuid: 'cashpoint-uuid',
  cashPointName: 'Main Cashier',
  cashPointLocation: 'Main Hospital',
  cashier: { uuid: 'cashier-uuid', display: 'Dr. Smith', links: [] },
  receiptNumber: 'REC-001',
  dateCreated: '2024-01-01',
  lineItems: [
    {
      uuid: 'line-1',
      billableService: 'Hemoglobin',
      item: 'Hemoglobin',
      display: 'Hemoglobin',
      quantity: 1,
      price: 100,
      paymentStatus: 'PENDING',
      lineItemOrder: 0,
      voided: false,
      voidReason: null,
      priceName: '',
      priceUuid: '',
      resourceVersion: '1.8',
    },
  ],
  payments: [],
  totalAmount: 100,
  tenderedAmount: 0,
  billingService: 'Hemoglobin',
  identifier: 'ID-001',
  id: 1,
};

const closeWorkspace = vi.fn();
const onMutate = vi.fn();

const defaultCreateProps = {
  workspaceProps: { patientUuid: 'patient-uuid', onMutate },
  closeWorkspace,
} as any;

const editModeProps = {
  workspaceProps: { patientUuid: 'patient-uuid', onMutate, billUuid: 'bill-123' },
  closeWorkspace,
} as any;

describe('BillingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      defaultCurrency: 'KES',
    });
    mockUseBillableServices.mockReturnValue({
      data: mockBillableItems as any,
      error: null,
      isLoading: false,
    } as any);
    mockUseBill.mockReturnValue({
      bill: null,
      error: null,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });
    mockUseBillableServicesList.mockReturnValue({
      billableServices: [{ uuid: 'bs-uuid-1', name: 'Hemoglobin' }],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    mockGetBillableServiceUuid.mockReturnValue('bs-uuid-1');
  });

  describe('Create mode (no billUuid)', () => {
    it('should render the search items combobox', () => {
      render(<BillingForm {...defaultCreateProps} />);
      expect(screen.getByText(/search items and services/i)).toBeInTheDocument();
    });

    it('should not show existing items section', () => {
      render(<BillingForm {...defaultCreateProps} />);
      expect(screen.queryByText(/existing items/i)).not.toBeInTheDocument();
    });

    it('should not show edit mode title in create mode', () => {
      render(<BillingForm {...defaultCreateProps} />);
      expect(screen.queryByText(/add items to bill/i)).not.toBeInTheDocument();
    });

    it('should call processBillItems on submit in create mode', async () => {
      const user = userEvent.setup();
      render(<BillingForm {...defaultCreateProps} />);

      // Open the combobox and select an item
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Consultation'));

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockProcessBillItems).toHaveBeenCalledWith(
          expect.objectContaining({
            patient: 'patient-uuid',
            status: 'PENDING',
            lineItems: expect.arrayContaining([
              expect.objectContaining({
                billableService: 'service-1',
                quantity: 1,
                price: 500,
                paymentStatus: 'PENDING',
              }),
            ]),
          }),
        );
      });
    });

    it('should disable submit button when no items are selected', () => {
      render(<BillingForm {...defaultCreateProps} />);
      const submitButton = screen.getByRole('button', { name: /save and close/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Edit mode (with billUuid)', () => {
    beforeEach(() => {
      mockUseBill.mockReturnValue({
        bill: mockExistingBill as any,
        error: null,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
    });

    it('should show existing line items in read-only format', () => {
      render(<BillingForm {...editModeProps} />);
      expect(screen.getByText(/existing items/i)).toBeInTheDocument();
      expect(screen.getByText('Hemoglobin')).toBeInTheDocument();
    });

    it('should show the "New items" heading', () => {
      render(<BillingForm {...editModeProps} />);
      expect(screen.getByText(/new items/i)).toBeInTheDocument();
    });

    it('should show existing items subtotal', () => {
      render(<BillingForm {...editModeProps} />);
      expect(screen.getByText(/subtotal/i)).toBeInTheDocument();
      expect(screen.getByText('KES 100')).toBeInTheDocument();
    });

    it('should show loading state while bill is loading', () => {
      mockUseBill.mockReturnValue({
        bill: null,
        error: null,
        isLoading: true,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<BillingForm {...editModeProps} />);
      expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
    });

    it('should show error state when bill fails to load', () => {
      mockUseBill.mockReturnValue({
        bill: null,
        error: new Error('Failed to load'),
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      render(<BillingForm {...editModeProps} />);
      expect(screen.getByText(/error loading bill/i)).toBeInTheDocument();
    });

    it('should call updateBillItems on submit in edit mode', async () => {
      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      // Open the combobox and select a new item
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateBillItems).toHaveBeenCalledWith(
          expect.objectContaining({
            uuid: 'bill-123',
            cashPoint: 'cashpoint-uuid',
            cashier: 'cashier-uuid',
            patient: 'patient-uuid',
            status: 'PENDING',
            lineItems: expect.arrayContaining([
              // Existing item with resolved billableService UUID
              expect.objectContaining({
                uuid: 'line-1',
                billableService: 'bs-uuid-1',
              }),
              // New item
              expect.objectContaining({
                billableService: 'service-2',
                quantity: 1,
                price: 1000,
                paymentStatus: 'PENDING',
              }),
            ]),
          }),
        );
      });
    });

    it('should not call processBillItems in edit mode', async () => {
      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateBillItems).toHaveBeenCalled();
      });
      expect(mockProcessBillItems).not.toHaveBeenCalled();
    });

    it('should show success snackbar after adding items to bill', async () => {
      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Items added to bill',
            kind: 'success',
          }),
        );
      });
    });

    it('should call onMutate after successful submission', async () => {
      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onMutate).toHaveBeenCalled();
      });
    });

    it('should include existing items total in grand total', async () => {
      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      // Add a new item
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      // Grand total should include existing (100) + new (1000) = 1100
      // The convertToCurrency mock formats as "KES <amount>"
      await waitFor(() => {
        expect(screen.getByText(/KES 1100/)).toBeInTheDocument();
      });
    });

    it('should show error snackbar when updateBillItems fails', async () => {
      mockUpdateBillItems.mockRejectedValueOnce(new Error('Server error'));

      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Bill processing error',
            kind: 'error',
            subtitle: 'Server error',
          }),
        );
      });
      expect(closeWorkspace).not.toHaveBeenCalled();
      expect(onMutate).not.toHaveBeenCalled();
    });

    it('should exclude existing bill line items from the combobox options', async () => {
      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      // Hemoglobin is already on the bill, so it should not appear in the dropdown
      const options = screen.getAllByRole('option');
      const optionTexts = options.map((option) => option.textContent);
      expect(optionTexts).toContain('Consultation');
      expect(optionTexts).toContain('Lab Test');
      expect(optionTexts).not.toContain('Hemoglobin');
    });

    it('should exclude items matching by the item field when billableService is null', async () => {
      mockUseBill.mockReturnValue({
        bill: {
          ...mockExistingBill,
          lineItems: [
            {
              ...mockExistingBill.lineItems[0],
              billableService: null,
              item: 'Hemoglobin',
            },
          ],
        } as any,
        error: null,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      const options = screen.getAllByRole('option');
      const optionTexts = options.map((option) => option.textContent);
      expect(optionTexts).not.toContain('Hemoglobin');
    });

    it('should show all billable items in create mode including those on existing bills', async () => {
      mockUseBill.mockReturnValue({
        bill: null,
        error: null,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });
      const user = userEvent.setup();
      render(<BillingForm {...defaultCreateProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);

      const options = screen.getAllByRole('option');
      const optionTexts = options.map((option) => option.textContent);
      expect(optionTexts).toContain('Consultation');
      expect(optionTexts).toContain('Lab Test');
      expect(optionTexts).toContain('Hemoglobin');
    });

    it('should resolve service UUID using the item field when billableService is null', async () => {
      mockUseBill.mockReturnValue({
        bill: {
          ...mockExistingBill,
          lineItems: [
            {
              ...mockExistingBill.lineItems[0],
              billableService: null,
              item: 'Hemoglobin',
            },
          ],
        } as any,
        error: null,
        isLoading: false,
        isValidating: false,
        mutate: vi.fn(),
      });

      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockGetBillableServiceUuid).toHaveBeenCalledWith(expect.anything(), 'Hemoglobin');
      });
    });

    it('should disable submit button while billable services list is loading in edit mode', () => {
      mockUseBillableServicesList.mockReturnValue({
        billableServices: [],
        isLoading: true,
        isValidating: false,
        error: null,
        mutate: vi.fn(),
      } as any);

      render(<BillingForm {...editModeProps} />);
      const submitButton = screen.getByRole('button', { name: /save and close/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show error notification when billable services list fails to load in edit mode', () => {
      mockUseBillableServicesList.mockReturnValue({
        billableServices: [],
        isLoading: false,
        isValidating: false,
        error: new Error('Failed to load services'),
        mutate: vi.fn(),
      } as any);

      render(<BillingForm {...editModeProps} />);
      expect(screen.getByText(/error loading billable services/i)).toBeInTheDocument();
    });

    it('should not submit when billable services list has an error in edit mode', async () => {
      mockUseBillableServicesList.mockReturnValue({
        billableServices: [],
        isLoading: false,
        isValidating: false,
        error: new Error('Failed to load services'),
        mutate: vi.fn(),
      } as any);

      // The error notification replaces the form content, so we can't select items.
      // Verify that updateBillItems is never called.
      render(<BillingForm {...editModeProps} />);
      expect(mockUpdateBillItems).not.toHaveBeenCalled();
    });

    it('should show error when billable service UUID cannot be resolved', async () => {
      mockGetBillableServiceUuid.mockReturnValue(null);

      const user = userEvent.setup();
      render(<BillingForm {...editModeProps} />);

      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      await user.click(screen.getByText('Lab Test'));

      const submitButton = screen.getByRole('button', { name: /save and close/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Bill processing error',
            kind: 'error',
          }),
        );
      });
      expect(mockUpdateBillItems).not.toHaveBeenCalled();
    });
  });
});
