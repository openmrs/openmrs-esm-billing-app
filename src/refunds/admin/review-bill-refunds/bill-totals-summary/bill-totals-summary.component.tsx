import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { convertToCurrency } from '../../../../helpers';
import type { BillingConfig } from '../../../../config-schema';
import type { BillRefund } from '../../../../types';
import styles from './bill-totals-summary.scss';

interface Props {
  subtotal: number;
  paymentsTotal: number;
  totalApprovedRefunds: number;
  approvedRefunds: BillRefund[];
  completedRefunds: BillRefund[];
  totalCompletedRefunds: number;
}

const BillTotalsSummary: React.FC<Props> = ({
  subtotal,
  paymentsTotal,
  totalApprovedRefunds,
  approvedRefunds,
  completedRefunds,
  totalCompletedRefunds,
}) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();

  return (
    <section className={styles.totals}>
      <div className={classNames(styles.totalsRow, styles.totalsSubtotal)}>
        <span>{t('billTotal', 'Bill total')}</span>
        <span>{convertToCurrency(subtotal, defaultCurrency)}</span>
      </div>

      <div className={classNames(styles.totalsRow, styles.totalsRowAdd)}>
        <span>{t('totalPaid', 'Total paid')}</span>
        <span>{convertToCurrency(paymentsTotal, defaultCurrency)}</span>
      </div>

      {completedRefunds.length > 0 && (
        <>
          <hr className={styles.totalsRule} />
          {completedRefunds.map((r) => (
            <div key={r.uuid} className={classNames(styles.totalsRow, styles.totalsRowAdd)}>
              <span>✓ {t('refundPaidOut', 'Refund paid out')}</span>
              <span>{convertToCurrency(r.refundAmount, defaultCurrency)}</span>
            </div>
          ))}
          <hr className={styles.totalsRuleStrong} />
          <div className={classNames(styles.totalsRow, styles.totalsOutstanding)}>
            <span>{t('totalRefunded', 'Total refunded')}</span>
            <span className={styles.totalsOutstandingAmount}>
              {convertToCurrency(totalCompletedRefunds, defaultCurrency)}
            </span>
          </div>
        </>
      )}

      {approvedRefunds.length > 0 && (
        <>
          <hr className={styles.totalsRule} />
          {approvedRefunds.map((r) => (
            <div key={r.uuid} className={classNames(styles.totalsRow, styles.totalsRowMinus)}>
              <span>↑ {t('approvedRefundPendingPayout', 'Approved refund (pending payout)')}</span>
              <span>{convertToCurrency(r.refundAmount, defaultCurrency)}</span>
            </div>
          ))}
          <hr className={styles.totalsRuleStrong} />
          <div className={classNames(styles.totalsRow, styles.totalsOutstanding)}>
            <span>{t('totalPendingPayout', 'Total pending payout')}</span>
            <span className={styles.totalsOutstandingAmount}>
              {convertToCurrency(totalApprovedRefunds, defaultCurrency)}
            </span>
          </div>
        </>
      )}
    </section>
  );
};

export default BillTotalsSummary;
