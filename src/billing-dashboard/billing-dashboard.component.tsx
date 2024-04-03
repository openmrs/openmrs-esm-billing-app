import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BillingHeader from '../billing-header/billing-header.component';
import MetricsCards from '../metrics-cards/metrics-cards.component';
import BillsTable from '../bills-table/bills-table.component';
import styles from './billing-dashboard.scss';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { omrsDateFormat } from '../constants';
import SelectedDateContext from '../hooks/selectedDateContext';

export function BillingDashboard() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().startOf('day').format(omrsDateFormat));

  let params = useParams();

  useEffect(() => {
    if (params.date) {
      setSelectedDate(dayjs(params.date).startOf('day').format(omrsDateFormat));
    }
  }, [params.date]);

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate }}>
      <BillingHeader title={t('home', 'Home')} />
      <MetricsCards />
      <section className={styles.billsTableContainer}>
        <BillsTable />
      </section>
    </SelectedDateContext.Provider>
  );
}
