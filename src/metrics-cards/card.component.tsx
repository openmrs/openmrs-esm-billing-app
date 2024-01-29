import React from 'react';
import styles from './card.scss';

export default function Card({ count, title }) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <span className={styles.count}>{count}</span>
    </div>
  );
}
