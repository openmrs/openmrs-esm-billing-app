import React from 'react';
import { Layer, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { isDesktop, launchWorkspace2, showModal, useLayoutType } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { BillStatus, type MappedBill } from '../types';
import styles from './bill-action-menu.scss';

type BillActionMenuProps = {
  bill: MappedBill;
  patientUuid: string;
  onMutate?: () => void;
};

const BillActionMenu: React.FC<BillActionMenuProps> = ({ bill, patientUuid, onMutate }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isPending = bill?.status === BillStatus.PENDING;

  const handleDeleteBill = () => {
    const dispose = showModal('delete-bill-confirmation-modal', {
      bill,
      onMutate,
      closeModal: () => dispose(),
    });
  };

  return (
    <Layer>
      <OverflowMenu
        align="left"
        flipped
        size={isDesktop(layout) ? 'sm' : 'lg'}
        data-testid={`action-menu-${bill.uuid}`}>
        <OverflowMenuItem
          className={styles.menuItem}
          itemText={t('addItemsToBill', 'Add items to bill')}
          onClick={() =>
            launchWorkspace2('billing-form-workspace', {
              patientUuid,
              billUuid: bill.uuid,
              onMutate,
            })
          }
        />
        {isPending && (
          <OverflowMenuItem
            className={styles.menuItem}
            hasDivider
            isDelete
            itemText={t('deleteBill', 'Delete bill')}
            onClick={handleDeleteBill}
          />
        )}
      </OverflowMenu>
    </Layer>
  );
};

export default BillActionMenu;
