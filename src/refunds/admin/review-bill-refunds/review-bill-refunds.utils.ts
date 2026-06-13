import { useMemo } from 'react';
import { RefundStatus, type BillRefund, type LineItem, type PatientInvoice, type Payment } from '../../../types';

export function useReviewRefundModel(bill: PatientInvoice | any) {
  const activeRefunds: BillRefund[] = useMemo(
    () => (bill.refunds ?? []).filter((r: BillRefund) => !r.voided),
    [bill.refunds],
  );

  const {
    requestedRefunds,
    decidedRefunds,
    approvedRefunds,
    completedRefunds,
    totalApprovedRefunds,
    totalCompletedRefunds,
    totalCommittedRefunds,
    lineItems,
    payments,
    paymentsTotal,
    subtotal,
  } = useMemo(() => {
    const requestedRefunds = activeRefunds.filter((r) => r.status === RefundStatus.REQUESTED);
    const decidedRefunds = activeRefunds.filter((r) => r.status !== RefundStatus.REQUESTED);
    const approvedRefunds = activeRefunds.filter((r) => r.status === RefundStatus.APPROVED);
    const completedRefunds = activeRefunds.filter((r) => r.status === RefundStatus.COMPLETED);
    const totalApprovedRefunds = approvedRefunds.reduce((sum, r) => sum + r.refundAmount, 0);
    const totalCompletedRefunds = completedRefunds.reduce((sum, r) => sum + r.refundAmount, 0);
    const totalCommittedRefunds = totalApprovedRefunds + totalCompletedRefunds;

    const lineItems = (bill.lineItems ?? []).filter((li: LineItem) => !li.voided);
    const payments = (bill.payments ?? []).filter((p: Payment) => !p.voided);
    const paymentsTotal = payments.reduce((sum: number, p: Payment) => sum + (p.amountTendered ?? 0), 0);

    const subtotal = bill.amountAfterDiscount;

    return {
      requestedRefunds,
      decidedRefunds,
      approvedRefunds,
      completedRefunds,
      totalApprovedRefunds,
      totalCompletedRefunds,
      totalCommittedRefunds,
      lineItems,
      payments,
      paymentsTotal,
      subtotal,
    };
  }, [activeRefunds, bill.lineItems, bill.payments, bill.amountAfterDiscount]);

  return {
    activeRefunds,
    requestedRefunds,
    decidedRefunds,
    approvedRefunds,
    completedRefunds,
    totalApprovedRefunds,
    totalCompletedRefunds,
    totalCommittedRefunds,
    lineItems,
    payments,
    paymentsTotal,
    subtotal,
  };
}
