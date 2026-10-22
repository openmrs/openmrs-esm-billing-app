import React from 'react';
import classNames from 'classnames';
import { Button, Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { formatDate, getCoreTranslation, parseDate, useConfig } from '@openmrs/esm-framework';
import type { BillingConfig } from '../../../../config-schema';
import { convertToCurrency } from '../../../../helpers';
import { RefundStatus, type BillRefund, type LineItem } from '../../../../types';
import styles from './refund-card.scss';

const statusTagType: Record<string, 'gray' | 'green' | 'red' | 'purple'> = {
  REQUESTED: 'gray',
  APPROVED: 'green',
  REJECTED: 'red',
  COMPLETED: 'purple',
};

interface Props {
  refund: BillRefund;
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

const RefundCard: React.FC<Props> = ({
  refund: r,
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
  const { defaultCurrency } = useConfig<BillingConfig>();

  const isRejecting = rejectingId === r.uuid;
  const isVoiding = voidingId === r.uuid;
  const showDefaultActions = !isRejecting && !isVoiding;

  const cardClass = classNames(styles.card, {
    [styles.cardRequested]: r.status === RefundStatus.REQUESTED,
    [styles.cardApproved]: r.status === RefundStatus.APPROVED,
    [styles.cardRejected]: r.status === RefundStatus.REJECTED,
    [styles.cardCompleted]: r.status === RefundStatus.COMPLETED,
  });

  const scopeName = r.lineItemUuid
    ? lineItems.find((l) => l.uuid === r.lineItemUuid)?.item ||
      lineItems.find((l) => l.uuid === r.lineItemUuid)?.billableService ||
      '--'
    : t('wholeBill', 'Whole bill');

  return (
    <article className={cardClass}>
      <header className={styles.cardTop}>
        <div className={styles.cardScope}>
          <span className={styles.cardScopeName}>{scopeName}</span>
        </div>
        {r.status !== RefundStatus.REQUESTED && (
          <Tag type={statusTagType[r.status]} size="sm">
            {t(r.status.toLowerCase(), r.status)}
          </Tag>
        )}
      </header>

      <div className={styles.cardFigure}>
        <span
          className={classNames(styles.cardAmount, {
            [styles.cardAmountVoided]: r.status === RefundStatus.REJECTED,
          })}>
          <span className={styles.cardAmountMinus}>−</span>
          {convertToCurrency(r.refundAmount, defaultCurrency)}
        </span>
      </div>

      <div>
        {t('reasonForRefund', 'Reason for refund')}: <p className={styles.cardJustification}>{r.reason}</p>
      </div>

      {r.status === RefundStatus.APPROVED && (
        <p className={styles.awaitingLabel}>{t('awaitingCashierProcessing', 'Awaiting cashier processing')}</p>
      )}

      <footer className={styles.cardFooter}>
        <div className={styles.cardByline}>
          {t('requestedBy', 'Requested by')} <strong>{r.initiator?.display}</strong>
          <span className={styles.cardBylineSep}>·</span>
          {formatDate(parseDate(r.dateCreated), { mode: 'wide' })}
        </div>
        <div className={styles.cardActions}>
          {showDefaultActions && r.status === RefundStatus.REQUESTED && (
            <>
              <Button
                kind="danger--tertiary"
                size="sm"
                disabled={disabled || !!processingRefundId}
                onClick={() => onStartReject(r.uuid)}>
                {t('reject', 'Reject')}
              </Button>
              <Button kind="primary" size="sm" disabled={disabled || !!processingRefundId} onClick={() => onApprove(r)}>
                {t('approve', 'Approve')}
              </Button>
            </>
          )}
          {showDefaultActions && (
            <Button
              kind="danger"
              size="sm"
              disabled={disabled || !!processingRefundId}
              onClick={() => onStartVoid(r.uuid)}>
              {t('delete', 'Delete')}
            </Button>
          )}
          {isRejecting && (
            <div className={styles.confirmRow}>
              <span className={styles.confirmCopy}>{t('rejectConfirmRefund', 'Reject this refund?')}</span>
              <div className={styles.confirmButtons}>
                <Button kind="ghost" size="sm" onClick={onCancelReject}>
                  {getCoreTranslation('cancel')}
                </Button>
                <Button
                  kind="danger"
                  size="sm"
                  disabled={disabled || !!processingRefundId}
                  onClick={() => onConfirmReject(r)}>
                  {t('confirmReject', 'Confirm reject')}
                </Button>
              </div>
            </div>
          )}
          {isVoiding && (
            <div className={styles.confirmRow}>
              <span className={styles.confirmCopy}>{t('deleteConfirmRefund', 'Delete this refund?')}</span>
              <div className={styles.confirmButtons}>
                <Button kind="ghost" size="sm" onClick={onCancelVoid}>
                  {getCoreTranslation('cancel')}
                </Button>
                <Button
                  kind="danger"
                  size="sm"
                  disabled={disabled || !!processingRefundId}
                  onClick={() => onConfirmVoid(r)}>
                  {t('confirmDelete', 'Confirm delete')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </footer>
    </article>
  );
};

export default RefundCard;
