import React from 'react';
import BillableServices from '../billable-services.component';
import styles from './dashboard.scss';
import { ExtensionSlot } from '@openmrs/esm-framework';

export default function BillableServicesDashboard() {
  return (
    <main className={styles.container}>
      <ExtensionSlot name="billing-home-tiles-slot" />
      <main className={styles.servicesTableContainer}>
        <BillableServices />
      </main>
    </main>
  );
}
