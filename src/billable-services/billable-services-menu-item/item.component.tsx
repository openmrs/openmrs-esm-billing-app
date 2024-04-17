import { ClickableTile } from '@carbon/react';
import React from 'react';
import styles from './item.scss';
import { Receipt } from '@carbon/react/icons';

const Item = () => {
  // items
  const openmrsSpaBase = window['getOpenmrsSpaBase']();

  return (
    <ClickableTile className={styles.customTile} id="menu-item" href={`${openmrsSpaBase}billable-services`}>
      <div className="customTileTitle">{<Receipt size={24} />}</div>
      <div>Billable Services</div>
    </ClickableTile>
  );
};
export default Item;
