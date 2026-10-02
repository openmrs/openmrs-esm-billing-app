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
       * TODO: Add the metrics cards when the backend provides an aggregate metrics endpoint.
       * Calculating them in the frontend requires downloading the complete bill history.
       */}
      <section className={styles.billsTableContainer}>
        <BillsTable />
      </section>
    </>
  );
}
