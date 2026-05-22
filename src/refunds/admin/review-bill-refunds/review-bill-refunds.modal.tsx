import React, { useCallback, useState } from 'react';
import { ModalBody, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import BillReceiptRail from './bill-receipt-rail/bill-receipt-rail.component';
import RefundReviewStack from './refund-review-stack/refund-review-stack.component';
import { actOnRefund } from '../../refunds.resource';
import { useReviewRefundModel } from './review-bill-refunds.utils';
import { RefundStatus, type BillRefund, type PatientInvoice } from '../../../types';
import styles from './review-bill-refunds.modal.scss';

const extractErrorMessage = (e: any): string =>
  e?.responseBody?.error?.message ?? (e instanceof Error ? e.message : String(e));

interface Props {
  closeModal: () => void;
  bill: PatientInvoice;
  onMutate: () => void;
}

const ReviewBillRefundsModal: React.FC<Props> = ({ closeModal, bill, onMutate }) => {
  const { t } = useTranslation();
  const session = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

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
  } = useReviewRefundModel(bill);

  const handleApprove = useCallback(
    async (r: BillRefund) => {
      if (totalCommittedRefunds + r.refundAmount > bill.amountAfterDiscount) {
        showSnackbar({
          title: t('approveBlockedRefund', 'Cannot approve refund'),
          subtitle: t('approveBlockedExceedsTotal', 'Approving this refund would exceed the bill total.'),
          kind: 'error',
        });
        return;
      }
      setBusy(r.uuid);
      try {
        await actOnRefund(r.uuid, { status: RefundStatus.APPROVED, approver: session.user?.uuid });
        showSnackbar({ title: t('refundApproved', 'Refund approved'), kind: 'success' });
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
    },
    [totalCommittedRefunds, bill.amountAfterDiscount, t, session.user?.uuid, onMutate, closeModal],
  );

  const confirmReject = useCallback(
    async (r: BillRefund) => {
      setBusy(r.uuid);
      try {
        await actOnRefund(r.uuid, { status: RefundStatus.REJECTED, approver: session.user?.uuid });
        showSnackbar({ title: t('refundRejected', 'Refund rejected'), kind: 'success' });
        onMutate();
        closeModal();
      } catch (e: unknown) {
        showSnackbar({ title: t('rejectFailed', 'Reject failed'), subtitle: extractErrorMessage(e), kind: 'error' });
      } finally {
        setBusy(null);
        setRejectingId(null);
      }
    },
    [t, session.user?.uuid, onMutate, closeModal],
  );

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('reviewRefunds', 'Review refunds')} />
      <ModalBody>
        <div className={styles.layout}>
          <BillReceiptRail
            bill={bill}
            lineItems={lineItems}
            payments={payments}
            paymentsTotal={paymentsTotal}
            subtotal={subtotal}
            totalApprovedRefunds={totalApprovedRefunds}
            approvedRefunds={approvedRefunds}
            completedRefunds={completedRefunds}
            totalCompletedRefunds={totalCompletedRefunds}
          />
          <RefundReviewStack
            requestedRefunds={requestedRefunds}
            decidedRefunds={decidedRefunds}
            lineItems={lineItems}
            busy={busy}
            rejectingId={rejectingId}
            onApprove={handleApprove}
            onStartReject={setRejectingId}
            onCancelReject={() => setRejectingId(null)}
            onConfirmReject={confirmReject}
          />
        </div>
      </ModalBody>
    </>
  );
};

export default ReviewBillRefundsModal;
