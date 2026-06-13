import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClickableTile } from '@carbon/react';
import { Receipt } from '@carbon/react/icons';
import styles from './item.scss';

const Item = () => {
  const { t } = useTranslation();
  const openmrsSpaBase = window['getOpenmrsSpaBase']();

  return (
    <ClickableTile className={styles.customTile} id="menu-item" href={`${openmrsSpaBase}billable-services`}>
      <div className="customTileTitle">{<Receipt size={24} />}</div>
      <div>{t('billableServices', 'Billable services')}</div>
    </ClickableTile>
  );
};
export default Item;
