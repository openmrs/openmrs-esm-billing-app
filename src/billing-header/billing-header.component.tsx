import React from 'react';
import { PageHeader, PageHeaderContent, PaymentsDeskPictogram } from '@openmrs/esm-framework';
import styles from './billing-header.scss';

interface BillingHeaderProps {
  title: string;
}

const BillingHeader: React.FC<BillingHeaderProps> = ({ title }) => {
  return (
    <PageHeader className={styles.header} data-testid="billing-header">
      <PageHeaderContent illustration={<PaymentsDeskPictogram />} title={title} />
    </PageHeader>
  );
};

export default BillingHeader;
