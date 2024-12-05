import React from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { convertToCurrency } from '../helpers';
import styles from './card.scss';

export default function Card({ count, title }) {
  const { defaultCurrency } = useConfig();
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.count}>
        {typeof count === 'number' ? convertToCurrency(count, defaultCurrency) : count}
      </span>
    </div>
  );
}
