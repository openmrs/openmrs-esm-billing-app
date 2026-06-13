import React from 'react';
import classNames from 'classnames';
import { Button, Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { formatDate, getCoreTranslation, parseDate, useConfig } from '@openmrs/esm-framework';
import type { BillingConfig } from '../../../../config-schema';
import { convertToCurrency } from '../../../../helpers';
import { BillDiscountStatus, BillDiscountType, type BillDiscount, type LineItem } from '../../../../types';
import styles from './discount-card.scss';

interface Props {
  discount: BillDiscount;
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

const statusKind: Record<BillDiscountStatus, 'gray' | 'green' | 'red'> = {
  PENDING: 'gray',
  APPROVED: 'green',
  REJECTED: 'red',
};

const DiscountCard: React.FC<Props> = ({
  discount: d,
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
  const { defaultCurrency } = useConfig<BillingConfig>();

  const isRejecting = rejectingId === d.uuid;
  const isDeleting = deletingId === d.uuid;
  const showDefaultActions = !isRejecting && !isDeleting;
  const cardClass = classNames(styles.card, {
    [styles.cardPending]: d.status === BillDiscountStatus.PENDING,
    [styles.cardApproved]: d.status === BillDiscountStatus.APPROVED,
    [styles.cardRejected]: d.status === BillDiscountStatus.REJECTED,
  });

  const formatValue =
    d.discountType === BillDiscountType.PERCENTAGE
      ? `${d.discountValue}%`
      : convertToCurrency(d.discountValue, defaultCurrency);

  const scopeName = d.lineItemUuid
    ? lineItems.find((l: LineItem) => l.uuid === d.lineItemUuid)?.item ||
      lineItems.find((l: LineItem) => l.uuid === d.lineItemUuid)?.billableService ||
      '--'
    : t('wholeBill', 'Whole bill');

  return (
    <article className={cardClass}>
      <header className={styles.cardTop}>
        <div className={styles.cardScope}>
          <span className={styles.cardScopeName}>{scopeName}</span>
          <span className={styles.cardScopeKind}>
            {d.discountType === BillDiscountType.PERCENTAGE
              ? t('percentage', 'Percentage')
              : t('fixedAmount', 'Fixed amount')}
          </span>
        </div>
        {d.status !== BillDiscountStatus.PENDING && (
          <Tag type={statusKind[d.status]} size="sm">
            {t(d.status.toLowerCase(), d.status)}
          </Tag>
        )}
      </header>

      <div className={styles.cardFigure}>
        <span
          className={classNames(styles.cardAmount, {
            [styles.cardAmountVoided]: d.status === BillDiscountStatus.REJECTED,
          })}>
          <span className={styles.cardAmountMinus}>−</span>
          {convertToCurrency(d.discountAmount, defaultCurrency)}
        </span>
        {d.discountType === BillDiscountType.PERCENTAGE && <span className={styles.cardValue}>{formatValue}</span>}
      </div>

      <div>
        {t('reasonForDiscount', 'Reason for discount')}: <p className={styles.cardJustification}>{d.justification}</p>
      </div>

      <footer className={styles.cardFooter}>
        <div className={styles.cardByline}>
          {t('requestedBy', 'Requested by')} <strong>{d.initiator?.display}</strong>
          <span className={styles.cardBylineSep}>·</span>
          {formatDate(parseDate(d.dateCreated), { mode: 'wide' })}
        </div>
        <div className={styles.cardActions}>
          {showDefaultActions && d.status === BillDiscountStatus.PENDING && (
            <>
              <Button
                kind="danger--tertiary"
                size="sm"
                disabled={!!busy || !canDecide}
                onClick={() => onStartReject(d.uuid)}>
                {t('reject', 'Reject')}
              </Button>
              <Button kind="primary" size="sm" disabled={!!busy || !canDecide} onClick={() => onApprove(d)}>
                {t('approve', 'Approve')}
              </Button>
            </>
          )}
          {showDefaultActions && (
            <Button kind="danger" size="sm" disabled={!!busy} onClick={() => onStartDelete(d.uuid)}>
              {t('delete', 'Delete')}
            </Button>
          )}
          {isRejecting && (
            <>
              <span className={styles.confirmCopy}>{t('rejectConfirm', 'Reject this discount?')}</span>
              <Button kind="ghost" size="sm" onClick={onCancelReject}>
                {getCoreTranslation('cancel')}
              </Button>
              <Button kind="danger" size="sm" disabled={!!busy} onClick={() => onConfirmReject(d)}>
                {t('confirmReject', 'Confirm reject')}
              </Button>
            </>
          )}
          {isDeleting && (
            <>
              <span className={styles.confirmCopy}>{t('deleteConfirm', 'Delete this discount?')}</span>
              <Button kind="ghost" size="sm" onClick={onCancelDelete}>
                {getCoreTranslation('cancel')}
              </Button>
              <Button kind="danger" size="sm" disabled={!!busy} onClick={() => onConfirmDelete(d)}>
                {t('confirmDelete', 'Confirm delete')}
              </Button>
            </>
          )}
        </div>
      </footer>
    </article>
  );
};

export default DiscountCard;
