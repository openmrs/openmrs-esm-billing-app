import React, { useMemo } from 'react';
import { InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { useBills } from '../billing.resource';
import { useBillMetrics } from './metrics.resource';
import Card from './card.component';
import styles from './metrics-cards.scss';

export default function MetricsCards() {
  const { t } = useTranslation();
  const { bills, isLoading, error } = useBills('');
  const { cumulativeBills, pendingBills, paidBills } = useBillMetrics(bills);

  const cards = useMemo(
    () => [
      { title: 'Cumulative Bills', count: cumulativeBills },
      { title: 'Pending Bills', count: pendingBills },
      { title: 'Paid Bills', count: paidBills },
    ],
    [cumulativeBills, pendingBills, paidBills],
  );

  if (isLoading) {
    return (
      <section className={styles.container}>
        <InlineLoading status="active" iconDescription="Loading" description="Loading bill metrics..." />
      </section>
    );
  }

  if (error) {
    return <ErrorState headerTitle={t('billMetrics', 'Bill metrics')} error={error} />;
  }
  return (
    <section className={styles.container}>
      {cards.map((card) => (
        <Card key={card.title} title={card.title} count={card.count} />
      ))}
    </section>
  );
}
