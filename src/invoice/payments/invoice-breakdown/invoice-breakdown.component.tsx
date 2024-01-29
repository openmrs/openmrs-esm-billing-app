import React from 'react';
import styles from './invoice-breakdown.scss';

type InvoiceBreakDownProps = {
  label: string;
  value: string;
  hasBalance?: Boolean;
};

export const InvoiceBreakDown: React.FC<InvoiceBreakDownProps> = ({ label, value, hasBalance }) => {
  return (
    <div className={styles.invoiceBreakdown}>
      <span className={hasBalance ? styles.extendedLabel : styles.label}>{label}: </span>
      <span className={styles.value}>{value}</span>
    </div>
  );
};
