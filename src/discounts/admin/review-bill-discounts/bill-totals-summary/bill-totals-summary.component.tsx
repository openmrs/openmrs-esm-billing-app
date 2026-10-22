import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { convertToCurrency } from '../../../../helpers';
import type { BillingConfig } from '../../../../config-schema';
import { BillDiscountType, type BillDiscount } from '../../../../types';
import styles from './bill-totals-summary.scss';

interface Props {
  subtotal: number;
  currentNet: number;
  outstanding: number;
  paymentsTotal: number;
  approvedDiscounts: BillDiscount[];
  pendingDiscounts: BillDiscount[];
}

const BillTotalsSummary: React.FC<Props> = ({
  subtotal,
  currentNet,
  outstanding,
  paymentsTotal,
  approvedDiscounts,
  pendingDiscounts,
}) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();

  const formatValue = (d: BillDiscount) =>
    d.discountType === BillDiscountType.PERCENTAGE
      ? `${d.discountValue}%`
      : convertToCurrency(d.discountValue, defaultCurrency);

  return (
    <section className={styles.totals}>
      <div className={classNames(styles.totalsRow, styles.totalsSubtotal)}>
        <span>{t('subtotal', 'Subtotal')}</span>
        <span>{convertToCurrency(subtotal, defaultCurrency)}</span>
      </div>
      {approvedDiscounts.map((d) => (
        <div key={d.uuid} className={classNames(styles.totalsRow, styles.totalsRowMinus)}>
          <span>− {t('discount', 'Discount')}</span>
          <span>{convertToCurrency(d.discountAmount, defaultCurrency)}</span>
        </div>
      ))}

      <hr className={styles.totalsRule} />

      <div className={classNames(styles.totalsRow, styles.totalsNet)}>
        <span>{t('currentNet', 'Current net')}</span>
        <span className={styles.totalsNetAmount}>{convertToCurrency(currentNet, defaultCurrency)}</span>
      </div>

      {paymentsTotal > 0 && (
        <div className={classNames(styles.totalsRow, styles.totalsRowAdd)}>
          <span>− {t('paymentsReceived', 'Payments received')}</span>
          <span>{convertToCurrency(paymentsTotal, defaultCurrency)}</span>
        </div>
      )}

      <hr className={styles.totalsRuleStrong} />

      <div className={classNames(styles.totalsRow, styles.totalsOutstanding)}>
        <span>{t('outstanding', 'Outstanding')}</span>
        <span className={styles.totalsOutstandingAmount}>{convertToCurrency(outstanding, defaultCurrency)}</span>
      </div>

      {pendingDiscounts.length > 0 && (
        <div className={styles.preview}>
          <p className={styles.previewLabel}>{t('ifPendingApproved', 'If pending discounts approved')}</p>
          {pendingDiscounts.map((d) => (
            <div key={d.uuid} className={classNames(styles.totalsRow, styles.totalsRowMinus)}>
              <span>
                − {t('discount', 'Discount')} ({formatValue(d)})
              </span>
              <span>{convertToCurrency(d.discountAmount, defaultCurrency)}</span>
            </div>
          ))}
          <div className={classNames(styles.totalsRow, styles.previewProjected)}>
            <span>{t('projectedNet', 'Projected net')}</span>
            <span className={styles.previewProjectedAmount}>
              {convertToCurrency(
                currentNet - pendingDiscounts.reduce((s, d) => s + d.discountAmount, 0),
                defaultCurrency,
              )}
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export default BillTotalsSummary;
