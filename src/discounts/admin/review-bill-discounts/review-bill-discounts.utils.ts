import { useMemo } from 'react';

import {
  BillDiscountStatus,
  type BillDiscount,
  type LineItem,
  type PatientInvoice,
  type Payment,
} from '../../../types';

export function useReviewBillModel(bill: PatientInvoice | any) {
  const activeDiscounts: BillDiscount[] = useMemo(
    () => (bill.discounts ?? []).filter((d: BillDiscount) => !d.voided),
    [bill.discounts],
  );

  const pendingDiscounts = activeDiscounts.filter((d) => d.status === BillDiscountStatus.PENDING);
  const confirmedDiscounts = activeDiscounts.filter((d) => d.status !== BillDiscountStatus.PENDING);
  const approvedDiscounts = activeDiscounts.filter((d) => d.status === BillDiscountStatus.APPROVED);

  const lineItems = (bill.lineItems ?? []).filter((li: LineItem) => !li.voided);

  const payments = (bill.payments ?? []).filter((p: Payment) => !p.voided);
  const paymentsTotal = payments.reduce((sum: number, p: Payment) => sum + (p.amountTendered ?? 0), 0);

  const subtotal = bill.total;
  const currentNet = bill.amountAfterDiscount;
  const outstanding = currentNet - paymentsTotal;

  return {
    activeDiscounts,
    pendingDiscounts,
    confirmedDiscounts,
    approvedDiscounts,
    lineItems,
    payments,
    paymentsTotal,
    subtotal,
    currentNet,
    outstanding,
  };
}
