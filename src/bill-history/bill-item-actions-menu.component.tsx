import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { launchWorkspace2, useLayoutType } from '@openmrs/esm-framework';
import styles from './bill-item-actions-menu.scss';
import type { MappedBill } from '../types';

interface BillItemActionsMenuProps {
  bill: MappedBill;
  patientUuid: string;
  onMutate?: () => void;
}

export const BillItemActionsMenu = ({ bill, patientUuid, onMutate }: BillItemActionsMenuProps) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const handleEditBill = () => {
    launchWorkspace2('billing-form-workspace', {
      patientUuid,
      billToEdit: bill,
      onMutate,
    });
  };

  return (
    <Layer className={styles.layer}>
      <OverflowMenu
        aria-label={t('editOrDeleteBill', 'Edit or delete bill')}
        align="left"
        size={isTablet ? 'lg' : 'sm'}
        flipped>
        <OverflowMenuItem
          className={styles.menuItem}
          id="editBill"
          onClick={handleEditBill}
          itemText={t('edit', 'Edit')}
          disabled={bill?.status !== 'PENDING'}
        />
        <OverflowMenuItem
          className={styles.menuItem}
          id="deleteBill"
          itemText={t('delete', 'Delete')}
          onClick={() => {}}
          isDelete
          hasDivider
        />
      </OverflowMenu>
    </Layer>
  );
};
