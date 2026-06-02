import React from 'react';
import { useTranslation } from 'react-i18next';
import RefundCard from '../refund-card/refund-card.component';
import type { BillRefund, LineItem } from '../../../../types';
import styles from './refund-review-stack.scss';

interface Props {
  requestedRefunds: BillRefund[];
  decidedRefunds: BillRefund[];
  lineItems: Array<LineItem>;
  processingRefundId: string | null;
  disabled: boolean;
  rejectingId: string | null;
  voidingId: string | null;
  onApprove: (r: BillRefund) => void;
  onStartReject: (uuid: string) => void;
  onCancelReject: () => void;
  onConfirmReject: (r: BillRefund) => void;
  onStartVoid: (uuid: string) => void;
  onCancelVoid: () => void;
  onConfirmVoid: (r: BillRefund) => void;
}

const RefundReviewStack: React.FC<Props> = ({
  requestedRefunds,
  decidedRefunds,
  lineItems,
  processingRefundId,
  disabled,
  rejectingId,
  voidingId,
  onApprove,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onStartVoid,
  onCancelVoid,
  onConfirmVoid,
}) => {
  const { t } = useTranslation();

  const renderCard = (r: BillRefund) => (
    <RefundCard
      key={r.uuid}
      refund={r}
      lineItems={lineItems}
      processingRefundId={processingRefundId}
      disabled={disabled}
      rejectingId={rejectingId}
      voidingId={voidingId}
      onApprove={onApprove}
      onStartReject={onStartReject}
      onCancelReject={onCancelReject}
      onConfirmReject={onConfirmReject}
      onStartVoid={onStartVoid}
      onCancelVoid={onCancelVoid}
      onConfirmVoid={onConfirmVoid}
    />
  );

  return (
    <section className={styles.review}>
      {requestedRefunds.length > 0 && (
        <div>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>{t('requestedRefunds', 'Requested refunds')}</h3>
            <span className={styles.groupCount}>{requestedRefunds.length}</span>
          </div>
          <div className={styles.stack}>{requestedRefunds.map(renderCard)}</div>
        </div>
      )}

      {decidedRefunds.length > 0 && (
        <div>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>{t('decidedRefunds', 'Decided refunds')}</h3>
            <span className={styles.groupCount}>{decidedRefunds.length}</span>
          </div>
          <div className={styles.stack}>{decidedRefunds.map(renderCard)}</div>
        </div>
      )}
    </section>
  );
};

export default React.memo(RefundReviewStack);
