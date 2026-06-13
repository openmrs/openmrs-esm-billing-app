import React from 'react';
import { Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import BillLineItemsTable from '../bill-line-items-table/bill-line-items-table.component';
import BillPaymentsTable from '../bill-payments-table/bill-payments-table.component';
import BillTotalsSummary from '../bill-totals-summary/bill-totals-summary.component';
import type { BillDiscount, LineItem, PatientInvoice, Payment } from '../../../../types';
import styles from './bill-receipt-rail.scss';

interface Props {
  bill: PatientInvoice | any;
  lineItems: Array<LineItem>;
  payments: Array<Payment>;
  paymentsTotal: number;
  subtotal: number;
  currentNet: number;
  outstanding: number;
  approvedDiscounts: BillDiscount[];
  pendingDiscounts: BillDiscount[];
}

const BillReceiptRail: React.FC<Props> = ({
  bill,
  lineItems,
  payments,
  paymentsTotal,
  subtotal,
  currentNet,
  outstanding,
  approvedDiscounts,
  pendingDiscounts,
}) => {
  const { t } = useTranslation();

  return (
    <aside className={styles.receipt}>
      <div className={styles.patient}>
        <div>
          <p className={styles.patientName}>{bill.patient?.display}</p>
          <p className={styles.patientId}>
            {t('receiptNumber', 'Receipt #')}: {bill.receiptNumber}
          </p>
        </div>
        {bill.status && (
          <Tag type="blue" size="sm">
            {t(String(bill.status).toLowerCase(), String(bill.status))}
          </Tag>
        )}
      </div>

      <dl className={styles.meta}>
        <dt>{t('issued', 'Issued')}</dt>
        <dd>{bill.dateCreated ? formatDate(parseDate(bill.dateCreated), { mode: 'wide' }) : '--'}</dd>
        <dt>{t('cashier', 'Cashier')}</dt>
        <dd>{bill.cashier?.display ?? '--'}</dd>
      </dl>

      <BillLineItemsTable lineItems={lineItems} />
      <BillPaymentsTable payments={payments} />
      <BillTotalsSummary
        subtotal={subtotal}
        currentNet={currentNet}
        outstanding={outstanding}
        paymentsTotal={paymentsTotal}
        approvedDiscounts={approvedDiscounts}
        pendingDiscounts={pendingDiscounts}
      />
    </aside>
  );
};

export default React.memo(BillReceiptRail);
