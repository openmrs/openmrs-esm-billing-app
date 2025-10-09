import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import AddBillableService from './add-billable-service.component';

interface EditBillableServiceModalProps {
  closeModal: () => void;
  editingService?: any;
  onServiceUpdated: () => void;
}

const EditBillableServiceModal: React.FC<EditBillableServiceModalProps> = ({
  closeModal,
  editingService,
  onServiceUpdated,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('billableService', 'Billable Service')} />
      <ModalBody>
        <AddBillableService
          editingService={editingService}
          onClose={closeModal}
          onServiceUpdated={onServiceUpdated}
          isModal={true}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button
          onClick={() => {
            // Trigger form submission programmatically
            const form = document.getElementById('billable-service-form') as HTMLFormElement;
            if (form) {
              form.requestSubmit();
            }
          }}>
          {t('save', 'Save')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default EditBillableServiceModal;
