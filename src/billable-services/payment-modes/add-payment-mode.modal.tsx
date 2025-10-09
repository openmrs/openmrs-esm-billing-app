import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, ModalBody, ModalFooter, ModalHeader, Stack, TextInput } from '@carbon/react';
import { showSnackbar, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

type PaymentModeFormValues = {
  name: string;
  description: string;
};

interface AddPaymentModeModalProps {
  closeModal: () => void;
  onPaymentModeAdded: () => void;
}

const AddPaymentModeModal: React.FC<AddPaymentModeModalProps> = ({ closeModal, onPaymentModeAdded }) => {
  const { t } = useTranslation();

  const paymentModeSchema = z.object({
    name: z.string().min(1, t('paymentModeNameRequired', 'Payment Mode Name is required')),
    description: z.string().optional(),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentModeFormValues>({
    resolver: zodResolver(paymentModeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (data: PaymentModeFormValues) => {
    try {
      await openmrsFetch(`${restBaseUrl}/billing/paymentMode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          name: data.name,
          description: data.description || '',
        },
      });

      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('paymentModeSaved', 'Payment mode was successfully saved.'),
        kind: 'success',
      });

      closeModal();
      reset({ name: '', description: '' });
      onPaymentModeAdded();
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: err?.message || t('errorSavingPaymentMode', 'An error occurred while saving the payment mode.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  };

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('addPaymentMode', 'Add Payment Mode')} />
      <Form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody>
          <Stack gap={5}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  id="payment-mode-name"
                  labelText={t('paymentModeName', 'Payment Mode Name')}
                  placeholder={t('paymentModeNamePlaceholder', 'e.g., Cash, Credit Card')}
                  invalid={!!errors.name}
                  invalidText={errors.name?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextInput
                  id="payment-mode-description"
                  labelText={t('description', 'Description')}
                  placeholder={t('descriptionPlaceholder', 'e.g., Used for all cash transactions')}
                  invalid={!!errors.description}
                  invalidText={errors.description?.message}
                  {...field}
                />
              )}
            />
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving', 'Saving') + '...' : t('save', 'Save')}
          </Button>
        </ModalFooter>
      </Form>
    </>
  );
};

export default AddPaymentModeModal;
