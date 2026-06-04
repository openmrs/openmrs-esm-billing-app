import React from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import type { BillingConfig } from '../../../../config-schema';
import { convertToCurrency } from '../../../../helpers';
import type { LineItem } from '../../../../types';
import styles from './bill-line-items-table.scss';

interface Props {
  lineItems: Array<LineItem>;
}

const BillLineItemsTable: React.FC<Props> = ({ lineItems }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();

  return (
    <section className={styles.ledger}>
      <h3 className={styles.ledgerHeading}>{t('lineItems', 'Line items')}</h3>
      <table className={styles.ledgerTable}>
        <thead>
          <tr>
            <th>{t('item', 'Item')}</th>
            <th>{t('qty', 'Qty')}</th>
            <th className={styles.right}>{t('price', 'Price')}</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li: LineItem, idx: number) => (
            <tr key={li.uuid ?? idx}>
              <td className={styles.itemName}>{li.item || li.billableService || '--'}</td>
              <td>{li.quantity}</td>
              <td className={styles.right}>{convertToCurrency(li.price ?? 0, defaultCurrency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default BillLineItemsTable;
