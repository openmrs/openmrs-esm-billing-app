import React, { useState } from 'react';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader, Stack, TextArea } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation, showSnackbar } from '@openmrs/esm-framework';
import { deleteBill } from '../billing.resource';
import { type MappedBill } from '../types';
import styles from './delete-line-item-confirmation.scss';

interface DeleteBillModalParams {
  closeModal: () => void;
  bill: MappedBill;
  onMutate?: () => void;
  onDelete?: () => void;
}

const DeleteBillModal: React.FC<DeleteBillModalParams> = ({ closeModal, bill, onMutate, onDelete }) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const handleDelete = async () => {
    if (!bill?.uuid) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteBill(bill.uuid, deleteReason.trim());

      showSnackbar({
        title: t('billDeleted', 'Bill deleted'),
        subtitle: t('billDeleteSuccess', 'Bill has been deleted successfully'),
        kind: 'success',
      });

      onMutate?.();
      onDelete?.();
      closeModal();
    } catch (err: any) {
      const message =
        err?.responseBody?.error?.message ||
        err?.message ||
        t('deleteFailedTryAgain', 'Unable to delete bill. Please try again.');

      showSnackbar({
        title: t('billDeleteFailed', 'Failed to delete bill'),
        subtitle: message,
        kind: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('deleteBill', 'Delete bill')} />

      <ModalBody className={styles.modalBody}>
        <Stack gap={5}>
          <p>
            {t(
              'deleteBillConfirmation',
              'Are you sure you want to delete bill {{receiptNumber}}? This action cannot be undone.',
              { receiptNumber: bill?.receiptNumber },
            )}
          </p>
          <TextArea
            enableCounter
            id="deleteBillReason"
            labelText={t('deleteReason', 'Reason for deletion')}
            maxCount={255}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder={t('deleteBillReasonPlaceholder', 'Enter the reason for deleting this bill')}
            required
            rows={3}
            value={deleteReason}
          />
        </Stack>
      </ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={closeModal} disabled={isDeleting}>
          {getCoreTranslation('cancel')}
        </Button>

        <Button kind="danger" onClick={handleDelete} disabled={isDeleting || !deleteReason.trim()}>
          {isDeleting ? (
            <InlineLoading className={styles.spinner} description={t('deleting', 'Deleting') + '...'} />
          ) : (
            <span>{getCoreTranslation('delete')}</span>
          )}
        </Button>
      </ModalFooter>
    </>
  );
};

export default DeleteBillModal;
