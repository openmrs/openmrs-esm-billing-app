import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Form, ModalBody, ModalFooter, ModalHeader, Stack, TextInput } from '@carbon/react';
import { showSnackbar, openmrsFetch, restBaseUrl, getCoreTranslation } from '@openmrs/esm-framework';

type PaymentModeFormValues = {
  uuid?: string;
  name: string;
  description: string;
};

interface AddPaymentModeModalProps {
  closeModal: () => void;
  onPaymentModeAdded: () => void;
  editPaymentMode?: PaymentModeFormValues;
}

const AddPaymentModeModal: React.FC<AddPaymentModeModalProps> = ({
  closeModal,
  onPaymentModeAdded,
  editPaymentMode,
}) => {
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
      name: editPaymentMode?.name,
      description: editPaymentMode?.description,
    },
  });

  const onSubmit = async (data: PaymentModeFormValues) => {
    try {
      let url = `${restBaseUrl}/billing/paymentMode`;
      if (editPaymentMode) {
        url = `${restBaseUrl}/billing/paymentMode/${editPaymentMode.uuid}`;
      }
      await openmrsFetch(url, {
        method: editPaymentMode?.uuid ? 'PUT' : 'POST',
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
        title: getCoreTranslation('error'),
        subtitle: err?.message || t('errorSavingPaymentMode', 'An error occurred while saving the payment mode.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  };

  return (
    <>
      <ModalHeader
        closeModal={closeModal}
        title={editPaymentMode ? t('editPaymentMode', 'Edit Payment Mode') : t('addPaymentMode', 'Add Payment Mode')}
      />
      <Form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody>
          <Stack gap={5}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  id="payment-mode-name"
                  labelText={t('paymentModeNameLabel', 'Payment Mode Name')}
                  placeholder={t('paymentModeNamePlaceholder', 'For example, Cash, Credit Card')}
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
                  placeholder={t('descriptionPlaceholder', 'For example, Used for all cash transactions')}
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
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving', 'Saving') + '...' : getCoreTranslation('save')}
          </Button>
        </ModalFooter>
      </Form>
    </>
  );
};

export default AddPaymentModeModal;
