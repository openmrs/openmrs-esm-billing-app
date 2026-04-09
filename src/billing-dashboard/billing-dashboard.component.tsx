import React from 'react';
import { useTranslation } from 'react-i18next';
import BillingHeader from '../billing-header/billing-header.component';
import BillsTable from '../bills-table/bills-table.component';
import styles from './billing-dashboard.scss';

export function BillingDashboard() {
  const { t } = useTranslation();

  return (
    <>
      <BillingHeader title={t('home', 'Home')} />
      {/**
       *
       * TODO: Add this back when the backend has an endpoint to get the metrics
       * The metrics are too intensive to calculate on the frontend since it requires fetching all the bills
       * <MetricsCards />
       **/}
      <section className={styles.billsTableContainer}>
        <BillsTable />
      </section>
    </>
  );
}
