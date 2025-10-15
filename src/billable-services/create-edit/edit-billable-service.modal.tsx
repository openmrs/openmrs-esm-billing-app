import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { getCoreTranslation } from '@openmrs/esm-framework';
import { type BillableService } from '../../types';
import AddBillableService from './add-billable-service.component';

interface EditBillableServiceModalProps {
  closeModal: () => void;
  onServiceUpdated: () => void;
  serviceToEdit?: BillableService;
}

const EditBillableServiceModal: React.FC<EditBillableServiceModalProps> = ({
  closeModal,
  serviceToEdit,
  onServiceUpdated,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('billableService', 'Billable service')} />
      <ModalBody>
        <AddBillableService
          serviceToEdit={serviceToEdit}
          isModal
          onClose={closeModal}
          onServiceUpdated={onServiceUpdated}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {getCoreTranslation('cancel')}
        </Button>
        <Button
          onClick={() => {
            // Trigger form submission programmatically
            const form = document.getElementById('billable-service-form') as HTMLFormElement;
            if (form) {
              form.requestSubmit();
            }
          }}>
          {getCoreTranslation('save')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default EditBillableServiceModal;
