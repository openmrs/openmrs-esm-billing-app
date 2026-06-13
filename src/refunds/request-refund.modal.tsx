import React, { useState } from 'react';
import {
  Button,
  InlineLoading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Stack,
  TextArea,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation, showSnackbar, useConfig } from '@openmrs/esm-framework';
import type { BillingConfig } from '../config-schema';
import { convertToCurrency } from '../helpers';
import { requestRefund } from './refunds.resource';
import styles from './request-refund.modal.scss';

interface Props {
  closeModal: () => void;
  bill: {
    uuid: string;
    total: number;
    amountAfterDiscount: number;
    receiptNumber?: string;
    lineItemCount?: number;
  };
  lineItem?: {
    uuid: string;
    display: string;
    total: number;
    quantity?: number;
    price?: number;
  };
  remainingRefundable: number;
  onMutate?: () => void;
}

const RequestRefundModal: React.FC<Props> = ({ closeModal, bill, lineItem, remainingRefundable, onMutate }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLineItem = !!lineItem;
  const scopeTotal = lineItem?.total ?? bill.total;
  const alreadyRefunded = isLineItem
    ? scopeTotal - remainingRefundable
    : bill.amountAfterDiscount - remainingRefundable;
  const trimmedReason = reason.trim();

  const reasonError = reason.length > 1000 ? t('reasonTooLong', 'Reason cannot exceed 1000 characters') : null;

  const amountError = (() => {
    if (amount == null || Number.isNaN(amount)) return null;
    if (remainingRefundable <= 0) return t('noRefundableAmount', 'No refundable amount remaining on this bill');
    if (amount <= 0) return t('amountMustBePositive', 'Amount must be greater than 0');
    if (amount > remainingRefundable)
      return t('amountExceedsRefundable', 'Amount cannot exceed {{max}}', {
        max: convertToCurrency(remainingRefundable, defaultCurrency),
      });
    return null;
  })();

  const canSubmit =
    !submitting && amount != null && amount > 0 && trimmedReason.length > 0 && !reasonError && !amountError;

  const handleSubmit = async () => {
    if (!canSubmit || amount == null) return;
    setSubmitting(true);
    try {
      await requestRefund({
        bill: bill.uuid,
        lineItem: lineItem?.uuid,
        refundAmount: amount,
        reason: trimmedReason,
      });
      onMutate?.();
      showSnackbar({
        title: t('refundRequested', 'Refund request submitted'),
        subtitle: t('refundPendingReview', 'An admin will review your request'),
        kind: 'success',
      });
      closeModal();
    } catch (err: unknown) {
      const subtitle = (err as any)?.responseBody?.error?.message ?? (err instanceof Error ? err.message : undefined);
      showSnackbar({
        title: t('refundRequestFailed', 'Could not submit refund request'),
        subtitle,
        kind: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('requestRefund', 'Request refund')} />
      <ModalBody className={styles.modalBody}>
        <Stack gap={5}>
          <section className={styles.scopePanel} aria-label={t('refundScope', 'Refund scope')}>
            <div className={styles.scopePrimary}>
              {isLineItem ? lineItem.display : t('wholeBillScope', 'Whole bill')}
            </div>
            <ul className={styles.scopeMeta}>
              {bill.receiptNumber && <li>{t('invoiceLabel', 'Invoice {{number}}', { number: bill.receiptNumber })}</li>}
              {isLineItem && lineItem.quantity != null && lineItem.price != null && (
                <li>
                  {t('qtyTimesPrice', 'Qty {{quantity}} × {{price}}', {
                    quantity: lineItem.quantity,
                    price: convertToCurrency(lineItem.price, defaultCurrency),
                  })}
                </li>
              )}
              {!isLineItem && bill.lineItemCount != null && (
                <li>{t('lineItemCount', '{{count}} line items', { count: bill.lineItemCount })}</li>
              )}
              <li className={styles.scopeTotal}>
                {isLineItem
                  ? t('lineTotalLabel', 'Line total {{total}}', {
                      total: convertToCurrency(scopeTotal, defaultCurrency),
                    })
                  : t('billTotalLabel', 'Bill total {{total}}', {
                      total: convertToCurrency(scopeTotal, defaultCurrency),
                    })}
              </li>
            </ul>
          </section>

          <NumberInput
            id="refund-amount"
            label={t('refundAmountLabel', 'Refund amount ({{currency}})', { currency: defaultCurrency })}
            allowEmpty
            min={0}
            max={remainingRefundable}
            value={amount ?? ''}
            invalid={!!amountError}
            invalidText={amountError ?? ''}
            onChange={(_e, { value: v }) => {
              if (v === '' || v == null) {
                setAmount(null);
                return;
              }
              const n = typeof v === 'string' ? Number.parseFloat(v) : v;
              setAmount(Number.isNaN(n) ? null : n);
            }}
          />

          {amount != null && amount > 0 && !amountError && (
            <section className={styles.summaryCard} aria-label={t('refundSummary', 'Refund summary')}>
              <span className={styles.summaryLabel}>
                {isLineItem ? t('lineTotal', 'Line total') : t('billTotal', 'Bill total')}
              </span>
              <span className={styles.summaryValue}>
                {convertToCurrency(isLineItem ? scopeTotal : bill.amountAfterDiscount, defaultCurrency)}
              </span>

              {alreadyRefunded > 0 && (
                <>
                  <span className={styles.summaryLabel}>{t('alreadyRefunded', 'Already refunded')}</span>
                  <span className={`${styles.summaryValue} ${styles.summaryRefund}`}>
                    −{convertToCurrency(alreadyRefunded, defaultCurrency)}
                  </span>
                </>
              )}

              <span className={styles.summaryLabel}>{t('refundAmount', 'Refund amount')}</span>
              <span className={`${styles.summaryValue} ${styles.summaryRefund}`}>
                −{convertToCurrency(amount, defaultCurrency)}
              </span>

              <span className={styles.summaryDivider} aria-hidden="true" />

              <span className={styles.summaryTotalLabel}>{t('amountAfterRefund', 'Amount after refund')}</span>
              <span className={styles.summaryTotalValue}>
                {convertToCurrency(remainingRefundable - amount, defaultCurrency)}
              </span>
            </section>
          )}

          <TextArea
            id="refund-reason"
            labelText={t('reason', 'Reason')}
            placeholder={
              isLineItem
                ? t('lineItemReasonPlaceholder', 'e.g., duplicate charge, wrong item billed')
                : t('billReasonPlaceholder', 'e.g., payment made in error, duplicate payment')
            }
            maxCount={1000}
            enableCounter
            required
            rows={3}
            value={reason}
            invalid={!!reasonError}
            invalidText={reasonError ?? ''}
            onChange={(e) => setReason(e.target.value)}
          />
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button kind="primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? (
            <InlineLoading description={t('submitting', 'Submitting') + '...'} />
          ) : (
            <span>{t('submitRequest', 'Submit request')}</span>
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default RequestRefundModal;
