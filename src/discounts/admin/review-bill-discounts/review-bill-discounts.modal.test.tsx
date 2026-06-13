import React from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useBill } from '../../../billing.resource';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import ReviewBillDiscountsModal from './review-bill-discounts.modal';
import { decideDiscount, voidDiscount } from '../../discounts.resource';
import {
  BillDiscountStatus,
  BillDiscountType,
  BillStatus,
  type BillDiscount,
  type PatientInvoice,
} from '../../../types';

vi.mock('@openmrs/esm-framework', () => ({
  showSnackbar: vi.fn(),
  useConfig: vi.fn().mockReturnValue({ defaultCurrency: 'USD' }),
  useSession: vi.fn().mockReturnValue({ user: { uuid: 'admin-uuid' } }),
  formatDate: () => 'date',
  parseDate: (s: string) => new Date(s),
  getCoreTranslation: (key: string) => key,
  restBaseUrl: '/ws/rest/v1',
}));
vi.mock('../../discounts.resource');
vi.mock('../../../billing.resource', () => ({
  useBill: vi.fn().mockReturnValue({ bill: null, mutate: vi.fn(), isLoading: false, isValidating: false }),
  useStockItems: vi.fn(),
}));

(window as any).i18next = { language: 'en-US' };

beforeEach(() => vi.clearAllMocks());

const makeDiscount = (overrides: Partial<BillDiscount> = {}): BillDiscount => ({
  uuid: 'd1',
  billUuid: 'b1',
  lineItemUuid: null,
  discountType: BillDiscountType.FIXED_AMOUNT,
  discountValue: 100,
  discountAmount: 100,
  justification: 'goodwill',
  initiator: { uuid: 'u1', display: 'Cashier A' },
  approver: null,
  dateCreated: '2026-05-11T00:00:00.000+0000',
  status: BillDiscountStatus.PENDING,
  voided: false,
  ...overrides,
});

const makeBill = (overrides: Partial<PatientInvoice> = {}): PatientInvoice =>
  ({
    uuid: 'b1',
    receiptNumber: 'INV-1',
    status: BillStatus.POSTED,
    total: 1000,
    amountAfterDiscount: 1000,
    dateCreated: '2026-05-11T00:00:00.000+0000',
    patient: { display: 'Jane Doe' },
    cashier: { display: 'cashier' },
    lineItems: [],
    payments: [],
    discounts: [],
    ...overrides,
  }) as unknown as PatientInvoice;

describe('ReviewBillDiscountsModal', () => {
  it('disables approve and reject on a bill that is neither PENDING nor POSTED', () => {
    const bill = makeBill({
      status: BillStatus.PAID,
      discounts: [makeDiscount()],
    });

    render(<ReviewBillDiscountsModal closeModal={vi.fn()} bill={bill} onMutate={vi.fn()} />);

    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('blocks approve when it would make the amount due negative', async () => {
    const user = userEvent.setup();
    const bill = makeBill({
      status: BillStatus.POSTED,
      total: 1000,
      amountAfterDiscount: 200,
      discounts: [makeDiscount({ discountAmount: 500 })],
    });

    render(<ReviewBillDiscountsModal closeModal={vi.fn()} bill={bill} onMutate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));
    expect(decideDiscount).not.toHaveBeenCalled();
  });

  it('blocks voiding an approved discount on a fully paid bill', async () => {
    const user = userEvent.setup();
    const bill = makeBill({
      status: BillStatus.PAID,
      total: 1000,
      amountAfterDiscount: 900,
      payments: [{ uuid: 'p1', amountTendered: 900, voided: false } as any],
      discounts: [makeDiscount({ status: BillDiscountStatus.APPROVED, discountAmount: 100 })],
    });

    render(<ReviewBillDiscountsModal closeModal={vi.fn()} bill={bill} onMutate={vi.fn()} />);

    // Carbon's danger--tertiary button prepends a visually-hidden "danger" span
    // to the accessible name; match by trailing text.
    await user.click(screen.getByRole('button', { name: /delete$/i }));
    await user.click(screen.getByRole('button', { name: /confirm delete$/i }));

    await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));
    expect(voidDiscount).not.toHaveBeenCalled();
  });

  it('does not close the modal after a successful approve', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();
    const onMutate = vi.fn();

    vi.mocked(decideDiscount).mockResolvedValue({
      ...makeDiscount(),
      status: BillDiscountStatus.APPROVED,
    } as any);

    const bill = makeBill({
      status: BillStatus.POSTED,
      total: 1000,
      amountAfterDiscount: 1000,
      discounts: [makeDiscount({ discountAmount: 100 })],
    });

    render(<ReviewBillDiscountsModal closeModal={closeModal} bill={bill} onMutate={onMutate} />);

    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' })));
    expect(closeModal).not.toHaveBeenCalled();
    expect(onMutate).toHaveBeenCalledOnce();
  });

  it('renders a progress bar and hides content while isLoading', () => {
    (useBill as Mock).mockReturnValue({ bill: null, mutate: vi.fn(), isLoading: true, isValidating: false });

    const bill = makeBill({ discounts: [makeDiscount()] });
    render(<ReviewBillDiscountsModal closeModal={vi.fn()} bill={bill} onMutate={vi.fn()} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });
});
