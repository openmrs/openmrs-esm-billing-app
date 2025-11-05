import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { omrsDateFormat } from '../constants';
import BillingHeader from '../billing-header/billing-header.component';
import BillsTable from '../bills-table/bills-table.component';
import MetricsCards from '../metrics-cards/metrics-cards.component';
import CashPointSelector from '../cash-point-selector/cash-point-selector.component';
import SelectedDateContext from '../hooks/selectedDateContext';
import SelectedCashPointContext from '../hooks/selectedCashPointContext';
import styles from './billing-dashboard.scss';

export function BillingDashboard() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().startOf('day').format(omrsDateFormat));
  const [selectedCashPoint, setSelectedCashPoint] = useState(null);

  const params = useParams();

  useEffect(() => {
    if (params.date) {
      setSelectedDate(dayjs(params.date).startOf('day').format(omrsDateFormat));
    }
  }, [params.date]);

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate }}>
      <SelectedCashPointContext.Provider value={{ selectedCashPoint, setSelectedCashPoint }}>
        <BillingHeader title={t('home', 'Home')} />
        <CashPointSelector />
        <MetricsCards />
        <section className={styles.billsTableContainer}>
          <BillsTable />
        </section>
      </SelectedCashPointContext.Provider>
    </SelectedDateContext.Provider>
  );
}
