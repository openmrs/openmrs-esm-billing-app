import React, { useState } from 'react';
import { ModalBody, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import BillReceiptRail from './bill-receipt-rail/bill-receipt-rail.component';
import DiscountReviewStack from './discount-review-stack/discount-review-stack.component';
import { decideDiscount, voidDiscount } from '../../discounts.resource';
import { useReviewBillModel } from './review-bill-discounts.utils';
import { BillDiscountStatus, BillStatus, type BillDiscount, type PatientInvoice } from '../../../types';
import styles from './review-bill-discounts.modal.scss';

const extractErrorMessage = (e: any): string | undefined =>
  e?.responseBody?.error?.message ?? (e instanceof Error ? e.message : undefined);

interface Props {
  closeModal: () => void;
  bill: PatientInvoice;
  onMutate: () => void;
}

const ReviewBillDiscountsModal: React.FC<Props> = ({ closeModal, bill, onMutate }) => {
  const { t } = useTranslation();
  const session = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localBill] = useState(bill);
  const canDecide = localBill.status === BillStatus.PENDING || localBill.status === BillStatus.POSTED;

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
  } = useReviewBillModel(localBill);

  const handleApprove = async (d: BillDiscount) => {
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
      onMutate();
      closeModal();
    } catch (e: unknown) {
      showSnackbar({
        title: t('approveFailed', 'Approve failed'),
        subtitle: extractErrorMessage(e),
        kind: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async (d: BillDiscount) => {
    if (!canDecide) return;
    setBusy(d.uuid);
    try {
      await decideDiscount(d.uuid, BillDiscountStatus.REJECTED, session.user.uuid);
      showSnackbar({ title: t('discountRejected', 'Discount rejected'), kind: 'success' });
      onMutate();
      closeModal();
    } catch (e: unknown) {
      showSnackbar({ title: t('rejectFailed', 'Reject failed'), subtitle: extractErrorMessage(e), kind: 'error' });
    } finally {
      setBusy(null);
      setRejectingId(null);
    }
  };

  const confirmDelete = async (d: BillDiscount) => {
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
      onMutate();
      closeModal();
    } catch (e: unknown) {
      showSnackbar({ title: t('deleteFailed', 'Delete failed'), subtitle: extractErrorMessage(e), kind: 'error' });
    } finally {
      setBusy(null);
      setDeletingId(null);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('reviewDiscounts', 'Review discounts')} />
      <ModalBody>
        <div className={styles.layout}>
          <BillReceiptRail
            bill={localBill}
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
            onCancelReject={() => setRejectingId(null)}
            onConfirmReject={confirmReject}
            onStartDelete={setDeletingId}
            onCancelDelete={() => setDeletingId(null)}
            onConfirmDelete={confirmDelete}
          />
        </div>
      </ModalBody>
    </>
  );
};

export default ReviewBillDiscountsModal;
