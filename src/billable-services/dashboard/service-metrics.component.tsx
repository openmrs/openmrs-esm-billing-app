import React, { useMemo } from 'react';
import { InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { useBillableServices } from '../billable-service.resource';
import Card from '../../metrics-cards/card.component';
import styles from '../../metrics-cards/metrics-cards.scss';
import { ExtensionSlot } from '@openmrs/esm-framework';

export default function ServiceMetrics() {
  const { t } = useTranslation();
  const { isLoading, error } = useBillableServices();

  const cards = useMemo(
    () => [
      { title: 'Cash Revenue', count: '--' },
      { title: 'Insurance Revenue', count: '--' },
      { title: 'Pending Claims', count: '--' },
    ],
    [],
  );

  if (isLoading) {
    return (
      <section className={styles.container}>
        <InlineLoading status="active" iconDescription="Loading" description="Loading service metrics..." />
      </section>
    );
  }

  if (error) {
    return <ErrorState headerTitle={t('serviceMetrics', 'Service Metrics')} error={error} />;
  }
  return (
    <section className={styles.container}>
      {cards.map((card) => (
        <Card key={card.title} title={card.title} count={card.count} />
      ))}
    </section>
  );
}
