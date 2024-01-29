import React from 'react';
import { useTranslation } from 'react-i18next';
import BillingHeader from '../billing-header/billing-header.component';
import MetricsCards from '../metrics-cards/metrics-cards.component';
import BillsTable from '../bills-table/bills-table.component';
import styles from './billing-dashboard.scss';

export function BillingDashboard() {
  const { t } = useTranslation();

  return (
    <main className={styles.container}>
      <BillingHeader title={t('home', 'Home')} />
      <MetricsCards />
      <section className={styles.billsTableContainer}>
        <BillsTable />
      </section>
    </main>
  );
}
