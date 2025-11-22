import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import BillingHeader from '../billing-header/billing-header.component';
import BillsTable from '../bills-table/bills-table.component';
import SelectedDateContext from '../hooks/selectedDateContext';
import { omrsDateFormat } from '../constants';
import styles from './billing-dashboard.scss';

export function BillingDashboard() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().startOf('day').format(omrsDateFormat));

  const params = useParams();

  useEffect(() => {
    if (params.date) {
      setSelectedDate(dayjs(params.date).startOf('day').format(omrsDateFormat));
    }
  }, [params.date]);

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate }}>
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
    </SelectedDateContext.Provider>
  );
}
