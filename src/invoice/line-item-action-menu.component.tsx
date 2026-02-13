import React, { useCallback } from 'react';
import { Layer, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { getCoreTranslation, isDesktop, showModal, useLayoutType } from '@openmrs/esm-framework';
import { type LineItem, type MappedBill } from '../types';
import styles from './line-item-action-menu.scss';

type LineItemActionMenuProps = {
  bill: MappedBill;
  item: LineItem;
  onMutate?: () => void;
};

const LineItemActionMenu: React.FC<LineItemActionMenuProps> = ({ bill, item, onMutate }) => {
  const layout = useLayoutType();

  const handleEditLineItem = useCallback(() => {
    const dispose = showModal('edit-bill-line-item-modal', {
      bill,
      item,
      closeModal: () => dispose(),
      onMutate,
    });
  }, [bill, item, onMutate]);

  const handleDeleteLineItem = useCallback(() => {
    const dispose = showModal('delete-line-item-confirmation-modal', {
      item,
      closeModal: () => dispose(),
      onMutate,
    });
  }, [item, onMutate]);

  const isPending = bill?.status === 'PENDING';

  return (
    <Layer>
      <OverflowMenu
        align="left"
        flipped
        size={isDesktop(layout) ? 'sm' : 'lg'}
        data-testid={`action-menu-${item.uuid}`}>
        <OverflowMenuItem
          className={styles.menuitem}
          data-testid={`edit-button-${item.uuid}`}
          disabled={!isPending}
          itemText={getCoreTranslation('edit')}
          onClick={handleEditLineItem}
        />
        <OverflowMenuItem
          className={styles.menuitem}
          data-testid={`delete-button-${item.uuid}`}
          disabled={!isPending}
          isDelete
          itemText={getCoreTranslation('delete')}
          onClick={handleDeleteLineItem}
        />
      </OverflowMenu>
    </Layer>
  );
};

export default LineItemActionMenu;
