import React from 'react';
import BillableServices from '../billable-services.component';
import styles from './dashboard.scss';

export default function BillableServicesDashboard() {
  return (
    <main className={styles.container}>
      <main className={styles.servicesTableContainer}>
        <BillableServices />
      </main>
    </main>
  );
}
