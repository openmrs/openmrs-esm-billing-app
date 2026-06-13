import React, { useCallback, useState } from 'react';
import { ModalBody, ModalHeader, ProgressBar } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import BillReceiptRail from './bill-receipt-rail/bill-receipt-rail.component';
import DiscountReviewStack from './discount-review-stack/discount-review-stack.component';
import { useBill } from '../../../billing.resource';
import { decideDiscount, voidDiscount } from '../../discounts.resource';
import { useReviewBillModel } from './review-bill-discounts.utils';
import { BillDiscountStatus, BillStatus, type BillDiscount, type PatientInvoice } from '../../../types';
import styles from './review-bill-discounts.modal.scss';

const extractErrorMessage = (e: any): string =>
  e?.responseBody?.error?.message ?? (e instanceof Error ? e.message : String(e));

interface Props {
  closeModal: () => void;
  bill: PatientInvoice;
  onMutate: () => void;
}

const ReviewBillDiscountsModal: React.FC<Props> = ({ closeModal, bill, onMutate }) => {
  const { t } = useTranslation();
  const session = useSession();
  const { bill: localBill, mutate: localMutate, isLoading, isValidating } = useBill(bill.uuid);
  const activeBill = localBill ?? bill;
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canDecide = activeBill.status === BillStatus.PENDING || activeBill.status === BillStatus.POSTED;

  const {
    pendingDiscounts,
    confirmedDiscounts,
    approvedDiscounts,
    lineItems,
    payments,
    paymentsTotal,
    subtotal,
    currentNet,
    outstanding,
  } = useReviewBillModel(activeBill);

  const handleApprove = useCallback(
    async (d: BillDiscount) => {
      if (!canDecide) return;
      if (outstanding - d.discountAmount < 0) {
        showSnackbar({
          title: t('approveBlocked', 'Cannot approve discount'),
          subtitle: t('approveBlockedNegativeDue', 'Approving this discount would push the amount due below zero.'),
          kind: 'error',
        });
        return;
      }
      setBusy(d.uuid);
      try {
        await decideDiscount(d.uuid, BillDiscountStatus.APPROVED, session.user.uuid);
        showSnackbar({ title: t('discountApproved', 'Discount approved'), kind: 'success' });
        await localMutate();
        onMutate();
      } catch (e: unknown) {
        showSnackbar({
          title: t('approveFailed', 'Approve failed'),
          subtitle: extractErrorMessage(e),
          kind: 'error',
        });
      } finally {
        setBusy(null);
      }
    },
    [canDecide, outstanding, t, session.user.uuid, localMutate, onMutate],
  );

  const confirmReject = useCallback(
    async (d: BillDiscount) => {
      if (!canDecide) return;
      setBusy(d.uuid);
      try {
        await decideDiscount(d.uuid, BillDiscountStatus.REJECTED, session.user.uuid);
        showSnackbar({ title: t('discountRejected', 'Discount rejected'), kind: 'success' });
        await localMutate();
        onMutate();
      } catch (e: unknown) {
        showSnackbar({ title: t('rejectFailed', 'Reject failed'), subtitle: extractErrorMessage(e), kind: 'error' });
      } finally {
        setBusy(null);
        setRejectingId(null);
      }
    },
    [canDecide, t, session.user.uuid, localMutate, onMutate],
  );

  const confirmDelete = useCallback(
    async (d: BillDiscount) => {
      if (d.status === BillDiscountStatus.APPROVED && outstanding <= 0) {
        showSnackbar({
          title: t('deleteBlocked', 'Cannot delete discount'),
          subtitle: t('deleteBlockedFullyPaid', 'An approved discount cannot be removed once the bill is fully paid.'),
          kind: 'error',
        });
        setDeletingId(null);
        return;
      }
      setBusy(d.uuid);
      try {
        await voidDiscount(d.uuid, 'Deleted by admin');
        showSnackbar({ title: t('discountDeleted', 'Discount deleted'), kind: 'success' });
        await localMutate();
        onMutate();
      } catch (e: unknown) {
        showSnackbar({ title: t('deleteFailed', 'Delete failed'), subtitle: extractErrorMessage(e), kind: 'error' });
      } finally {
        setBusy(null);
        setDeletingId(null);
      }
    },
    [outstanding, t, localMutate, onMutate],
  );

  const handleCancelReject = useCallback(() => setRejectingId(null), []);
  const handleCancelDelete = useCallback(() => setDeletingId(null), []);

  const showProgress = !!busy || isLoading || isValidating;

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('reviewDiscounts', 'Review discounts')} />
      <ModalBody>
        {showProgress ? (
          <ProgressBar label="" hideLabel />
        ) : (
          <div className={styles.layout}>
            <BillReceiptRail
              bill={activeBill}
              lineItems={lineItems}
              payments={payments}
              paymentsTotal={paymentsTotal}
              subtotal={subtotal}
              currentNet={currentNet}
              outstanding={outstanding}
              approvedDiscounts={approvedDiscounts}
              pendingDiscounts={pendingDiscounts}
            />
            <DiscountReviewStack
              pendingDiscounts={pendingDiscounts}
              confirmedDiscounts={confirmedDiscounts}
              lineItems={lineItems}
              busy={busy}
              rejectingId={rejectingId}
              deletingId={deletingId}
              canDecide={canDecide}
              onApprove={handleApprove}
              onStartReject={setRejectingId}
              onCancelReject={handleCancelReject}
              onConfirmReject={confirmReject}
              onStartDelete={setDeletingId}
              onCancelDelete={handleCancelDelete}
              onConfirmDelete={confirmDelete}
            />
          </div>
        )}
      </ModalBody>
    </>
  );
};

export default ReviewBillDiscountsModal;
