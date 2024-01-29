import React from 'react';
import { useDefaultFacility } from '../../billing.resource';
import styles from './printable-footer.scss';

const PrintableFooter = () => {
  const { data, isLoading } = useDefaultFacility();

  if (isLoading) {
    return <div>--</div>;
  }

  return (
    <div className={styles.container}>
      <p className={styles.itemFooter}>{data?.display}</p>
    </div>
  );
};

export default PrintableFooter;
