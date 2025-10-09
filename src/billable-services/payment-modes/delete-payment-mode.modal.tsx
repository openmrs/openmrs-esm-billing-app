import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

interface DeletePaymentModeModalProps {
  closeModal: () => void;
  paymentModeUuid: string;
  paymentModeName: string;
  onPaymentModeDeleted: () => void;
}

const DeletePaymentModeModal: React.FC<DeletePaymentModeModalProps> = ({
  closeModal,
  paymentModeUuid,
  paymentModeName,
  onPaymentModeDeleted,
}) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await openmrsFetch(`${restBaseUrl}/billing/paymentMode/${paymentModeUuid}`, {
        method: 'DELETE',
      });

      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('paymentModeDeleted', 'Payment mode was successfully deleted.'),
        kind: 'success',
      });

      closeModal();
      onPaymentModeDeleted();
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: err?.message || t('errorDeletingPaymentMode', 'An error occurred while deleting the payment mode.'),
        kind: 'error',
        isLowContrast: false,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('deletePaymentMode', 'Delete Payment Mode')} />
      <ModalBody>
        <p>{t('confirmDeleteMessage', 'Are you sure you want to delete this payment mode? Proceed cautiously.')}</p>
        {paymentModeName && (
          <p>
            <strong>
              {t('paymentModeName', 'Payment Mode Name')}: {paymentModeName}
            </strong>
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? t('deleting', 'Deleting') + '...' : t('delete', 'Delete')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default DeletePaymentModeModal;
