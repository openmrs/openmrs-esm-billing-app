import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSWRConfig } from 'swr';
import { Button, Form, ModalBody, ModalFooter, ModalHeader, Stack, TextInput } from '@carbon/react';
import { showSnackbar, getCoreTranslation } from '@openmrs/esm-framework';
import { type PaymentModePayload } from '../../types';
import { apiBasePath } from '../../constants';
import { createPaymentMode, updatePaymentMode } from '../billable-service.resource';

type PaymentModeFormValues = {
  uuid?: string;
  name: string;
  description: string;
};

interface PaymentModeFormModalProps {
  closeModal: () => void;
  editPaymentMode?: PaymentModeFormValues;
}

const PaymentModeFormModal: React.FC<PaymentModeFormModalProps> = ({ closeModal, editPaymentMode }) => {
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();

  const paymentModeSchema = z.object({
    name: z.string().min(1, t('paymentModeNameRequired', 'Payment mode name is required')),
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
      name: editPaymentMode?.name ?? '',
      description: editPaymentMode?.description ?? '',
    },
  });

  const onSubmit = async (data: PaymentModeFormValues) => {
    const url = `${apiBasePath}paymentMode`;
    try {
      const payload: PaymentModePayload = {
        name: data.name,
        description: data.description,
      };
      if (editPaymentMode?.uuid) {
        await updatePaymentMode(editPaymentMode.uuid, payload);
      } else {
        await createPaymentMode(payload);
      }

      mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });

      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('paymentModeSaved', 'Payment mode was successfully saved.'),
        kind: 'success',
      });

      closeModal();
      reset({ name: '', description: '' });
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
        title={editPaymentMode ? t('editPaymentMode', 'Edit payment mode') : t('addPaymentMode', 'Add payment mode')}
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
                  labelText={t('paymentModeNameLabel', 'Payment mode name')}
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

export default PaymentModeFormModal;
