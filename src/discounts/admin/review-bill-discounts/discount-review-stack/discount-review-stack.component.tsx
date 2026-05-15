import React from 'react';
import { useTranslation } from 'react-i18next';
import DiscountCard from '../discount-card/discount-card.component';
import type { BillDiscount, LineItem } from '../../../../types';
import styles from './discount-review-stack.scss';

interface Props {
  pendingDiscounts: BillDiscount[];
  confirmedDiscounts: BillDiscount[];
  lineItems: Array<LineItem>;
  busy: string | null;
  rejectingId: string | null;
  deletingId: string | null;
  canDecide: boolean;
  onApprove: (d: BillDiscount) => void;
  onStartReject: (uuid: string) => void;
  onCancelReject: () => void;
  onConfirmReject: (d: BillDiscount) => void;
  onStartDelete: (uuid: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (d: BillDiscount) => void;
}

const DiscountReviewStack: React.FC<Props> = ({
  pendingDiscounts,
  confirmedDiscounts,
  lineItems,
  busy,
  rejectingId,
  deletingId,
  canDecide,
  onApprove,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
}) => {
  const { t } = useTranslation();

  const renderCard = (d: BillDiscount) => (
    <DiscountCard
      key={d.uuid}
      discount={d}
      lineItems={lineItems}
      busy={busy}
      rejectingId={rejectingId}
      deletingId={deletingId}
      canDecide={canDecide}
      onApprove={onApprove}
      onStartReject={onStartReject}
      onCancelReject={onCancelReject}
      onConfirmReject={onConfirmReject}
      onStartDelete={onStartDelete}
      onCancelDelete={onCancelDelete}
      onConfirmDelete={onConfirmDelete}
    />
  );

  return (
    <section className={styles.review}>
      {pendingDiscounts.length > 0 && (
        <div>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>{t('pendingDiscounts', 'Pending discounts')}</h3>
            <span className={styles.groupCount}>{pendingDiscounts.length}</span>
          </div>
          <div className={styles.stack}>{pendingDiscounts.map(renderCard)}</div>
        </div>
      )}

      {confirmedDiscounts.length > 0 && (
        <div>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>{t('confirmedDiscounts', 'Confirmed discounts')}</h3>
            <span className={styles.groupCount}>{confirmedDiscounts.length}</span>
          </div>
          <div className={styles.stack}>{confirmedDiscounts.map(renderCard)}</div>
        </div>
      )}
    </section>
  );
};

export default React.memo(DiscountReviewStack);
