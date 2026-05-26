import React, { useCallback, useState } from 'react';
import { ModalBody, ModalHeader, ProgressBar } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useSession } from '@openmrs/esm-framework';
import BillReceiptRail from './bill-receipt-rail/bill-receipt-rail.component';
import RefundReviewStack from './refund-review-stack/refund-review-stack.component';
import { useBill } from '../../../billing.resource';
import { actOnRefund, voidRefund } from '../../refunds.resource';
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
  const { bill: localBill, mutate: localMutate, isLoading, isValidating } = useBill(bill.uuid, false);
  const activeBill = localBill ?? bill;
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);

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
  } = useReviewRefundModel(activeBill);

  const handleApprove = useCallback(
    async (r: BillRefund) => {
      if (totalCommittedRefunds + r.refundAmount > activeBill.amountAfterDiscount) {
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
    [totalCommittedRefunds, activeBill.amountAfterDiscount, t, session.user?.uuid, localMutate, onMutate],
  );

  const confirmReject = useCallback(
    async (r: BillRefund) => {
      setBusy(r.uuid);
      try {
        await actOnRefund(r.uuid, { status: RefundStatus.REJECTED, approver: session.user?.uuid });
        showSnackbar({ title: t('refundRejected', 'Refund rejected'), kind: 'success' });
        await localMutate();
        onMutate();
      } catch (e: unknown) {
        showSnackbar({ title: t('rejectFailed', 'Reject failed'), subtitle: extractErrorMessage(e), kind: 'error' });
      } finally {
        setBusy(null);
        setRejectingId(null);
      }
    },
    [t, session.user?.uuid, localMutate, onMutate],
  );

  const confirmVoid = useCallback(
    async (r: BillRefund) => {
      setBusy(r.uuid);
      try {
        await voidRefund(r.uuid, 'Voided by admin');
        showSnackbar({ title: t('refundVoided', 'Refund voided'), kind: 'success' });
        await localMutate();
        onMutate();
      } catch (e: unknown) {
        showSnackbar({ title: t('voidFailed', 'Void failed'), subtitle: extractErrorMessage(e), kind: 'error' });
      } finally {
        setBusy(null);
        setVoidingId(null);
      }
    },
    [t, localMutate, onMutate],
  );

  const showProgress = !!busy || isLoading || isValidating;

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('reviewRefunds', 'Review refunds')} />
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
              voidingId={voidingId}
              onApprove={handleApprove}
              onStartReject={setRejectingId}
              onCancelReject={() => setRejectingId(null)}
              onConfirmReject={confirmReject}
              onStartVoid={setVoidingId}
              onCancelVoid={() => setVoidingId(null)}
              onConfirmVoid={confirmVoid}
            />
          </div>
        )}
      </ModalBody>
    </>
  );
};

export default ReviewBillRefundsModal;
