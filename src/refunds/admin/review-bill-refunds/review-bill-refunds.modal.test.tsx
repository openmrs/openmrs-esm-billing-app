import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import ReviewBillRefundsModal from './review-bill-refunds.modal';
import { actOnRefund, voidRefund } from '../../refunds.resource';
import { useBill } from '../../../billing.resource';
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
vi.mock('../../../billing.resource', () => ({
  useBill: vi.fn().mockReturnValue({ bill: null, mutate: vi.fn(), isLoading: false, isValidating: false }),
  useStockItems: vi.fn(),
}));

globalThis.i18next = { language: 'en-US' } as any;

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

  it('shows a progress bar above the content and disables action buttons while loading', () => {
    vi.mocked(useBill).mockReturnValueOnce({
      bill: null,
      mutate: vi.fn(),
      isLoading: true,
      isValidating: false,
      error: undefined,
    } as any);
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/requested refunds/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
  });

  it('shows an error notification and hides bill content when bill fetch fails', () => {
    vi.mocked(useBill).mockReturnValueOnce({
      bill: null,
      mutate: vi.fn(),
      isLoading: false,
      isValidating: false,
      error: new Error('Network error'),
    } as any);
    render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
    expect(screen.getByText(/failed to load bill/i)).toBeInTheDocument();
    expect(screen.queryByText(/requested refunds/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });

  describe('line item refunds', () => {
    const lineItem = { uuid: 'li-1', item: 'Lab Test', price: 1000, quantity: 1, status: 'PENDING' as any };
    const lineItemRefund = { ...requestedRefund, uuid: 'r-li', lineItemUuid: 'li-1', refundAmount: 500 };

    it('shows the line item name as the refund scope instead of "Whole bill"', () => {
      const bill = { ...makeBill([lineItemRefund]), lineItems: [lineItem] };
      render(<ReviewBillRefundsModal closeModal={closeModal} bill={bill as any} onMutate={onMutate} />);
      // "Lab Test" appears in both the receipt rail and the refund card scope
      expect(screen.getAllByText('Lab Test').length).toBeGreaterThan(0);
      // No refund should show "Whole bill" when all refunds are line-item-scoped
      expect(screen.queryByText(/whole bill/i)).not.toBeInTheDocument();
    });

    it('approves a line-item refund within the line item total', async () => {
      vi.mocked(actOnRefund).mockResolvedValue({} as any);
      const bill = { ...makeBill([lineItemRefund]), lineItems: [lineItem] };
      const user = userEvent.setup();
      render(<ReviewBillRefundsModal closeModal={closeModal} bill={bill as any} onMutate={onMutate} />);
      await user.click(screen.getByRole('button', { name: /approve/i }));
      await waitFor(() =>
        expect(actOnRefund).toHaveBeenCalledWith('r-li', { status: RefundStatus.APPROVED, approver: 'u-admin' }),
      );
      expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
    });

    it('blocks approving a line-item refund that would exceed the line item total', async () => {
      const overRefund = { ...lineItemRefund, refundAmount: 1500 };
      const bill = { ...makeBill([overRefund]), lineItems: [lineItem] };
      const user = userEvent.setup();
      render(<ReviewBillRefundsModal closeModal={closeModal} bill={bill as any} onMutate={onMutate} />);
      await user.click(screen.getByRole('button', { name: /approve/i }));
      expect(actOnRefund).not.toHaveBeenCalled();
      expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' }));
    });
  });

  describe('delete (void) flow', () => {
    // Carbon danger buttons get accessible name "danger{Label}" (e.g. "dangerDelete"),
    // so we match with /delete/i (no anchors) which safely covers "dangerDelete".
    it('shows the delete confirm prompt when Delete is clicked', async () => {
      const user = userEvent.setup();
      render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(screen.getByText(/delete this refund/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
    });

    it('cancels delete and restores the default actions when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(screen.queryByText(/delete this refund/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('calls voidRefund and shows a success snackbar when delete is confirmed', async () => {
      vi.mocked(voidRefund).mockResolvedValue({} as any);
      const user = userEvent.setup();
      render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));
      await waitFor(() => expect(voidRefund).toHaveBeenCalledWith('r1', 'Voided by admin'));
      expect(onMutate).toHaveBeenCalled();
      expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
    });

    it('shows an error snackbar and does not call onMutate when delete fails', async () => {
      vi.mocked(voidRefund).mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();
      render(<ReviewBillRefundsModal closeModal={closeModal} bill={makeBill([requestedRefund])} onMutate={onMutate} />);
      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /confirm delete/i }));
      await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));
      expect(onMutate).not.toHaveBeenCalled();
    });
  });

  it('disables Approve on all cards while any card approval is in flight', async () => {
    let resolveApprove: (v: any) => void;
    vi.mocked(actOnRefund).mockReturnValue(new Promise((res) => (resolveApprove = res)));

    const refund2 = { ...requestedRefund, uuid: 'r2', reason: 'duplicate charge' };
    const user = userEvent.setup();
    render(
      <ReviewBillRefundsModal
        closeModal={closeModal}
        bill={makeBill([requestedRefund, refund2])}
        onMutate={onMutate}
      />,
    );

    const [approveA, approveB] = screen.getAllByRole('button', { name: /approve/i });
    await user.click(approveA);

    expect(approveB).toBeDisabled();
    resolveApprove({});
  });

  it('disables Confirm reject on any card while another card approval is in flight', async () => {
    let resolveApprove: (v: any) => void;
    vi.mocked(actOnRefund).mockReturnValue(new Promise((res) => (resolveApprove = res)));

    const refund2 = { ...requestedRefund, uuid: 'r2', reason: 'duplicate charge' };
    const user = userEvent.setup();
    render(
      <ReviewBillRefundsModal
        closeModal={closeModal}
        bill={makeBill([requestedRefund, refund2])}
        onMutate={onMutate}
      />,
    );

    // Open reject confirmation on card 2 (no API call yet)
    // Filter to plain Reject buttons (not "Confirm reject") — there is one per REQUESTED card
    const rejectButtons = screen
      .getAllByRole('button', { name: /reject/i })
      .filter((btn) => !/confirm/i.test(btn.textContent ?? ''));
    await user.click(rejectButtons[1]);
    expect(screen.getByText(/reject this refund/i)).toBeInTheDocument();

    // Approve card 1 — leaves processing in flight
    await user.click(screen.getByRole('button', { name: /approve/i }));

    // Confirm reject on card 2 should now be disabled
    expect(screen.getByRole('button', { name: /confirm reject/i })).toBeDisabled();
    resolveApprove({});
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
