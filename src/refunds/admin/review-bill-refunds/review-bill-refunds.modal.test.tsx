import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import ReviewBillRefundsModal from './review-bill-refunds.modal';
import { actOnRefund } from '../../refunds.resource';
import { RefundStatus, BillStatus, type PatientInvoice } from '../../../types';

vi.mock('@openmrs/esm-framework', () => ({
  showSnackbar: vi.fn(),
  useSession: vi.fn(),
  useConfig: vi.fn().mockReturnValue({ defaultCurrency: 'USD' }),
  formatDate: () => '2026-05-21',
  parseDate: (s: string) => new Date(s),
  getCoreTranslation: (key: string) => key,
  restBaseUrl: '/ws/rest/v1',
}));
vi.mock('../../refunds.resource');

window.i18next = { language: 'en-US' } as any;

const closeModal = vi.fn();
const onMutate = vi.fn();

const makeBill = (refunds: any[] = []): PatientInvoice =>
  ({
    uuid: 'b1',
    status: BillStatus.PAID,
    total: 5000,
    amountAfterDiscount: 5000,
    receiptNumber: 'INV-1',
    patient: { uuid: 'p1', display: 'John Doe', links: [] },
    cashier: { uuid: 'c1', display: 'cashier', links: [] },
    dateCreated: '2026-05-21T00:00:00.000+0000',
    lineItems: [],
    payments: [{ uuid: 'pay1', amountTendered: 5000, amount: 5000, voided: false } as any],
    refunds,
    discounts: [],
  }) as any;

const requestedRefund = {
  uuid: 'r1',
  billUuid: 'b1',
  lineItemUuid: null,
  refundAmount: 500,
  reason: 'overcharged',
  initiator: { uuid: 'u1', display: 'cashier' },
  approver: null,
  completer: null,
  dateApproved: null,
  dateCompleted: null,
  dateCreated: '2026-05-21T00:00:00.000+0000',
  status: RefundStatus.REQUESTED,
  voided: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue({ user: { uuid: 'u-admin' } } as any);
});

describe('ReviewBillRefundsModal', () => {
  it('renders the receipt rail and review stack', () => {
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/requested refunds/i)).toBeInTheDocument();
  });

  it('approves a REQUESTED refund', async () => {
    vi.mocked(actOnRefund).mockResolvedValue({} as any);
    const user = userEvent.setup();
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() =>
      expect(actOnRefund).toHaveBeenCalledWith('r1', { status: RefundStatus.APPROVED, approver: 'u-admin' }),
    );
    expect(onMutate).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('blocks approve when totalApprovedRefunds + refundAmount exceeds amountAfterDiscount', async () => {
    const bigRefund = { ...requestedRefund, uuid: 'r2', refundAmount: 6000 };
    const user = userEvent.setup();
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([bigRefund])} onMutate={onMutate} />);
    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(actOnRefund).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('rejects a REQUESTED refund after inline confirm', async () => {
    vi.mocked(actOnRefund).mockResolvedValue({} as any);
    const user = userEvent.setup();
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
    await user.click(screen.getByRole('button', { name: /reject/i }));
    expect(screen.getByText(/reject this refund/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm reject/i }));
    await waitFor(() =>
      expect(actOnRefund).toHaveBeenCalledWith('r1', { status: RefundStatus.REJECTED, approver: 'u-admin' }),
    );
  });

  it('shows read-only state for APPROVED refund', () => {
    const approvedRefund = { ...requestedRefund, uuid: 'r3', status: RefundStatus.APPROVED };
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([approvedRefund])} onMutate={onMutate} />);
    expect(screen.getByText(/awaiting cashier processing/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });

  it('blocks approve when completed refunds + new refund amount exceeds amountAfterDiscount', async () => {
    const completedRefund = {
      ...requestedRefund,
      uuid: 'r-done',
      refundAmount: 700,
      status: RefundStatus.COMPLETED,
      voided: false,
    };
    const newRequest = { ...requestedRefund, uuid: 'r-new', refundAmount: 500 };
    const bill = makeBill([completedRefund, newRequest]);
    // amountAfterDiscount = 5000 on makeBill, override to 1000 to make the sum exceed
    const smallBill = { ...bill, amountAfterDiscount: 1000 };
    const user = userEvent.setup();
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={smallBill as any} onMutate={onMutate} />);
    await user.click(screen.getByRole('button', { name: /approve/i }));
    expect(actOnRefund).not.toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
  });

  it('does not throw when session.user is null and approve is clicked', async () => {
    vi.mocked(useSession).mockReturnValue({ user: null } as any);
    vi.mocked(actOnRefund).mockResolvedValue({} as any);
    const user = userEvent.setup();
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() =>
      expect(actOnRefund).toHaveBeenCalledWith('r1', { status: RefundStatus.APPROVED, approver: undefined }),
    );
  });

  it('does not throw when session.user is null and reject-confirm is clicked', async () => {
    vi.mocked(useSession).mockReturnValue({ user: null } as any);
    vi.mocked(actOnRefund).mockResolvedValue({} as any);
    const user = userEvent.setup();
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
    await user.click(screen.getByRole('button', { name: /reject/i }));
    await user.click(screen.getByRole('button', { name: /confirm reject/i }));
    await waitFor(() =>
      expect(actOnRefund).toHaveBeenCalledWith('r1', { status: RefundStatus.REJECTED, approver: undefined }),
    );
  });
});
