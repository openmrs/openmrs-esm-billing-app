import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, useConfig } from '@openmrs/esm-framework';
import type { BillingConfig } from '../../../../config-schema';
import { convertToCurrency } from '../../../../helpers';
import type { Payment } from '../../../../types';
import styles from './bill-payments-table.scss';

interface Props {
  payments: Array<Payment>;
}

const BillPaymentsTable: React.FC<Props> = ({ payments }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();

  if (payments.length === 0) return null;

  return (
    <section className={styles.ledger}>
      <h3 className={styles.ledgerHeading}>{t('payments', 'Payments')}</h3>
      <table className={styles.ledgerTable}>
        <thead>
          <tr>
            <th>{t('method', 'Method')}</th>
            <th>{t('date', 'Date')}</th>
            <th className={styles.right}>{t('tendered', 'Tendered')}</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p: Payment) => (
            <tr key={p.uuid}>
              <td>
                <span className={styles.paymentKind}>{p.instanceType?.name ?? '--'}</span>
              </td>
              <td>
                <span className={styles.paymentDate}>
                  {p.dateCreated ? formatDate(new Date(p.dateCreated), { mode: 'wide' }) : '--'}
                </span>
              </td>
              <td className={styles.right}>{convertToCurrency(p.amountTendered ?? 0, defaultCurrency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default BillPaymentsTable;
