import React, { useMemo } from 'react';
import { InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorState, getCoreTranslation } from '@openmrs/esm-framework';
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
      { title: t('cumulativeBills', 'Cumulative bills'), count: cumulativeBills },
      { title: t('pendingBills', 'Pending bills'), count: pendingBills },
      { title: t('paidBills', 'Paid bills'), count: paidBills },
    ],
    [cumulativeBills, pendingBills, paidBills, t],
  );

  if (isLoading) {
    return (
      <section className={styles.container}>
        <InlineLoading
          status="active"
          iconDescription={getCoreTranslation('loading')}
          description={t('loadingBillMetrics', 'Loading bill metrics') + '...'}
        />
      </section>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <ErrorState headerTitle={t('billMetrics', 'Bill metrics')} error={error} />
      </div>
    );
  }

  return (
    <section className={styles.container}>
      {cards.map((card) => (
        <Card key={card.title} title={card.title} count={card.count} />
      ))}
    </section>
  );
}
