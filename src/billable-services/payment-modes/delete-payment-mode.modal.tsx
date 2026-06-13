import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSWRConfig } from 'swr';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar, openmrsFetch, restBaseUrl, getCoreTranslation } from '@openmrs/esm-framework';
import { apiBasePath } from '../../constants';

interface DeletePaymentModeModalProps {
  closeModal: () => void;
  paymentModeUuid: string;
  paymentModeName: string;
}

const DeletePaymentModeModal: React.FC<DeletePaymentModeModalProps> = ({
  closeModal,
  paymentModeUuid,
  paymentModeName,
}) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const url = `${apiBasePath}paymentMode`;
    try {
      await openmrsFetch(`${restBaseUrl}/billing/paymentMode/${paymentModeUuid}`, {
        method: 'DELETE',
      });

      mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });

      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('paymentModeDeleted', 'Payment mode was successfully deleted.'),
        kind: 'success',
      });

      closeModal();
    } catch (err) {
      showSnackbar({
        title: getCoreTranslation('error'),
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
              {t('paymentModeNameToDelete', 'Payment Mode Name: {{paymentModeName}}', { paymentModeName })}
            </strong>
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? t('deleting', 'Deleting') + '...' : getCoreTranslation('delete')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default DeletePaymentModeModal;
