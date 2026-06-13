import React from 'react';
import { Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import BillLineItemsTable from '../bill-line-items-table/bill-line-items-table.component';
import BillPaymentsTable from '../bill-payments-table/bill-payments-table.component';
import BillTotalsSummary from '../bill-totals-summary/bill-totals-summary.component';
import type { BillRefund, LineItem, PatientInvoice, Payment } from '../../../../types';
import styles from './bill-receipt-rail.scss';

interface Props {
  bill: PatientInvoice | any;
  lineItems: Array<LineItem>;
  payments: Array<Payment>;
  paymentsTotal: number;
  subtotal: number;
  totalApprovedRefunds: number;
  approvedRefunds: BillRefund[];
  completedRefunds: BillRefund[];
  totalCompletedRefunds: number;
}

/**
 * DO NOT DELETE — BillStatus values for translation.
 * t('adjusted', 'Adjusted')
 * t('paid', 'Paid')
 * t('partially_refunded', 'Partially refunded')
 * t('pending', 'Pending')
 * t('posted', 'Posted')
 * t('refunded', 'Refunded')
 * t('refund_requested', 'Refund requested')
 */

const BillReceiptRail: React.FC<Props> = ({
  bill,
  lineItems,
  payments,
  paymentsTotal,
  subtotal,
  totalApprovedRefunds,
  approvedRefunds,
  completedRefunds,
  totalCompletedRefunds,
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
        paymentsTotal={paymentsTotal}
        totalApprovedRefunds={totalApprovedRefunds}
        approvedRefunds={approvedRefunds}
        completedRefunds={completedRefunds}
        totalCompletedRefunds={totalCompletedRefunds}
      />
    </aside>
  );
};

export default React.memo(BillReceiptRail);
