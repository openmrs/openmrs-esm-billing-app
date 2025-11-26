import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation, showSnackbar } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import { deleteBillItem } from '../billing.resource';
import { type LineItem, type MappedBill } from '../types';
import styles from './delete-line-item-confirmation.scss';
import { apiBasePath } from '../constants';

interface DeleteListItemParams {
  closeModal: () => void;
  item: LineItem;
}

const DeleteListItem: React.FC<DeleteListItemParams> = ({ closeModal, item }) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const url = `${apiBasePath}bill`;

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);

    try {
      //  line item deleted using billing.resource request
      await deleteBillItem(item.uuid);

      //update the listItem
      mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });

      showSnackbar({
        title: t('lineItemDeleted', 'Line item deleted'),
        subtitle: t('lineItemDeleteSuccess', 'The bill line item has been removed successfully'),
        kind: 'success',
      });

      closeModal();
    } catch (err: any) {
      const message =
        err?.responseBody?.error?.message ||
        err?.message ||
        t('deleteFailedTryAgain', 'Unable to delete line item. Please try again.');

      showSnackbar({
        title: t('lineItemDeleteFailed', 'Failed to delete line item'),
        subtitle: message,
        kind: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ModalHeader
        className={styles.sectionTitle}
        closeModal={closeModal}
        title={t('deleteLineItem', 'Delete line item')}
      />

      <ModalBody className={styles.modalBody}>
        <p>{t('deleteConfirmation', 'Are you sure you want to delete this line item ?')}</p>
      </ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>

        <Button kind="danger" onClick={handleDeleteConfirm} disabled={isDeleting}>
          {isDeleting ? (
            <InlineLoading className={styles.spinner} description={t('deleting', 'Deleting')} />
          ) : (
            <span>{getCoreTranslation('delete')}</span>
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default DeleteListItem;
