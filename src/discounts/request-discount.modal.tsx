import React, { useState } from 'react';
import {
  Button,
  FormGroup,
  InlineLoading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  RadioButton,
  RadioButtonGroup,
  Stack,
  TextArea,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation, showSnackbar, useConfig } from '@openmrs/esm-framework';
import type { BillingConfig } from '../config-schema';
import { convertToCurrency } from '../helpers';
import { BillDiscountType } from '../types';
import { requestDiscount } from './discounts.resource';
import styles from './request-discount.modal.scss';

interface Props {
  closeModal: () => void;
  bill: {
    uuid: string;
    total: number;
    amountDue: number;
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
  onMutate?: () => void;
}

const RequestDiscountModal: React.FC<Props> = ({ closeModal, bill, lineItem, onMutate }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const [discountType, setDiscountType] = useState<BillDiscountType>(BillDiscountType.PERCENTAGE);
  const [value, setValue] = useState<number | null>(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLineItem = !!lineItem;
  const scopeTotal = lineItem?.total ?? bill.total;

  const trimmedJustification = justification.trim();

  const discountAmount =
    value != null && !Number.isNaN(value) && value > 0
      ? discountType === BillDiscountType.PERCENTAGE
        ? (scopeTotal * value) / 100
        : value
      : null;

  const justificationPlaceholder = isLineItem
    ? t('lineItemJustificationPlaceholder', 'e.g., damaged item, wrong quantity billed, expired stock')
    : t('billJustificationPlaceholder', 'e.g., hardship assistance, charity case, write-off');

  const justificationError =
    justification.length > 1000 ? t('justificationTooLong', 'Justification cannot exceed 1000 characters') : null;

  const valueError = (() => {
    if (value == null || Number.isNaN(value)) return null;
    if (value <= 0) return t('valueMustBePositive', 'Value must be greater than 0');
    if (discountType === BillDiscountType.PERCENTAGE && value > 100)
      return t('percentageTooHigh', 'Percentage cannot exceed 100');
    if (discountAmount == null) return null;
    if (discountAmount > bill.amountDue) return t('discountExceedsAmountDue', 'Discount cannot exceed the amount due');
    if (lineItem && discountAmount > lineItem.total)
      return t('discountExceedsLineTotal', 'Discount cannot exceed the line item total');
    return null;
  })();

  const canSubmit =
    !submitting && value != null && trimmedJustification.length > 0 && !justificationError && !valueError;

  const handleSubmit = async () => {
    if (!canSubmit || value == null) return;
    setSubmitting(true);
    try {
      await requestDiscount({
        bill: bill.uuid,
        lineItem: lineItem?.uuid,
        discountType,
        discountValue: value,
        justification: trimmedJustification,
      });
      onMutate?.();
      showSnackbar({
        title: t('discountRequested', 'Discount request submitted'),
        subtitle: t('discountPendingReview', 'An admin will review your request'),
        kind: 'success',
      });
      closeModal();
    } catch (err: unknown) {
      const subtitle = (err as any)?.responseBody?.error?.message ?? (err instanceof Error ? err.message : undefined);
      showSnackbar({
        title: t('discountRequestFailed', 'Could not submit discount request'),
        subtitle,
        kind: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('requestDiscount', 'Request discount')} />
      <ModalBody className={styles.modalBody}>
        <Stack gap={5}>
          <section className={styles.scopePanel} aria-label={t('discountScope', 'Discount scope')}>
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

          <FormGroup legendText={t('discount', 'Discount')} className={styles.discountGroup}>
            <Stack gap={4}>
              <RadioButtonGroup
                legendText=""
                name="discount-type"
                valueSelected={discountType}
                onChange={(v) => setDiscountType(v as BillDiscountType)}>
                <RadioButton labelText={t('percentage', 'Percentage')} value={BillDiscountType.PERCENTAGE} />
                <RadioButton labelText={t('fixedAmount', 'Fixed amount')} value={BillDiscountType.FIXED_AMOUNT} />
              </RadioButtonGroup>

              <NumberInput
                id="discount-value"
                label={
                  discountType === BillDiscountType.PERCENTAGE
                    ? t('valuePercentLabel', 'Value (%)')
                    : t('valueAmountLabel', 'Value ({{currency}})', { currency: defaultCurrency })
                }
                allowEmpty
                min={0}
                value={value ?? ''}
                invalid={!!valueError}
                invalidText={valueError ?? ''}
                onChange={(_e, { value: v }) => {
                  if (v === '' || v == null) {
                    setValue(null);
                    return;
                  }
                  const n = typeof v === 'string' ? parseFloat(v) : v;
                  setValue(Number.isNaN(n) ? null : n);
                }}
              />
            </Stack>
          </FormGroup>

          {discountAmount != null && (
            <section className={styles.summaryCard} aria-label={t('discountSummary', 'Discount summary')}>
              <span className={styles.summaryLabel}>
                {isLineItem ? t('lineTotal', 'Line total') : t('billTotal', 'Bill total')}
              </span>
              <span className={styles.summaryValue}>{convertToCurrency(scopeTotal, defaultCurrency)}</span>

              <span className={styles.summaryLabel}>
                {discountType === BillDiscountType.PERCENTAGE && value != null
                  ? t('discountWithPercent', 'Discount ({{percent}}%)', { percent: value })
                  : t('discountLabel', 'Discount')}
              </span>
              <span className={`${styles.summaryValue} ${styles.summaryDiscount}`}>
                −{convertToCurrency(discountAmount, defaultCurrency)}
              </span>

              {isLineItem && (
                <>
                  <span className={styles.summaryLabel}>{t('lineAfterDiscount', 'Line after discount')}</span>
                  <span className={styles.summaryValue}>
                    {convertToCurrency(scopeTotal - discountAmount, defaultCurrency)}
                  </span>
                </>
              )}

              <span className={styles.summaryDivider} aria-hidden="true" />

              <span className={styles.summaryLabel}>{t('outstanding', 'Outstanding')}</span>
              <span className={styles.summaryValue}>{convertToCurrency(bill.amountDue, defaultCurrency)}</span>

              <span className={styles.summaryTotalLabel}>
                {t('amountDueOnBillAfterDiscount', 'Amount due on bill after discount')}
              </span>
              <span className={styles.summaryTotalValue}>
                {convertToCurrency(bill.amountDue - discountAmount, defaultCurrency)}
              </span>
            </section>
          )}

          <TextArea
            id="discount-justification"
            labelText={t('justification', 'Justification')}
            placeholder={justificationPlaceholder}
            maxCount={1000}
            enableCounter
            required
            rows={3}
            value={justification}
            invalid={!!justificationError}
            invalidText={justificationError ?? ''}
            onChange={(e) => setJustification(e.target.value)}
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

export default RequestDiscountModal;
