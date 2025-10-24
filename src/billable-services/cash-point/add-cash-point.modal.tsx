import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Dropdown, Form, ModalBody, ModalFooter, ModalHeader, Stack, TextInput } from '@carbon/react';
import { showSnackbar, openmrsFetch, restBaseUrl, getCoreTranslation } from '@openmrs/esm-framework';
import { createCashPoint, updateCashPoint } from '../billable-service.resource';
import type { CashPoint, CreateCashPointPayload, UpdateCashPointPayload } from '../../types';

type CashPointFormValues = {
  name: string;
  location: string;
};

interface AddCashPointModalProps {
  cashPointToEdit?: CashPoint;
  closeModal: () => void;
  onCashPointAdded: () => void;
}

const AddCashPointModal: React.FC<AddCashPointModalProps> = ({ cashPointToEdit, closeModal, onCashPointAdded }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);

  const cashPointSchema = z.object({
    name: z.string().min(1, t('cashPointNameRequired', 'Cash Point Name is required')),
    location: z.string().min(1, t('locationRequired', 'Location is required')),
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CashPointFormValues>({
    resolver: zodResolver(cashPointSchema),
    defaultValues: {
      name: cashPointToEdit?.name ?? '',
      location: cashPointToEdit?.location?.uuid ?? '',
    },
  });

  const fetchLocations = useCallback(async () => {
    try {
      const response = await openmrsFetch(`${restBaseUrl}/location?v=default`);
      const allLocations = response.data.results.map((loc: any) => ({
        id: loc.uuid,
        label: loc.display,
      }));
      setLocations(allLocations);
    } catch (err) {
      showSnackbar({
        title: getCoreTranslation('error'),
        subtitle: t('errorFetchingLocations', 'An error occurred while fetching locations.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  }, [t]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const onSubmit = async (data: CashPointFormValues) => {
    try {
      if (cashPointToEdit) {
        const updatePayload: UpdateCashPointPayload = {
          name: data.name,
          location: { uuid: data.location },
        };
        await updateCashPoint(cashPointToEdit.uuid, updatePayload);
      } else {
        const createPayload: CreateCashPointPayload = {
          name: data.name,
          location: { uuid: data.location },
        };
        await createCashPoint(createPayload);
      }
      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('cashPointSaved', 'Cash point was successfully saved.'),
        kind: 'success',
      });

      closeModal();
      reset({ name: '', location: '' });
      onCashPointAdded();
    } catch (err) {
      showSnackbar({
        title: getCoreTranslation('error'),
        subtitle: err?.message || t('errorSavingCashPoint', 'An error occurred while saving the cash point.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  };

  return (
    <>
      <ModalHeader
        closeModal={closeModal}
        title={cashPointToEdit ? t('editCashPoint', 'Edit cash point') : t('addCashPoint', 'Add cash point')}
      />
      <Form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody>
          <Stack gap={5}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  id="cash-point-name"
                  labelText={t('cashPointName', 'Cash Point Name')}
                  placeholder={t('cashPointNamePlaceholder', 'For example, Pharmacy Cash Point')}
                  invalid={!!errors.name}
                  invalidText={errors.name?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <Dropdown
                  id="cash-point-location"
                  label={t('selectLocation', 'Select Location')}
                  titleText={t('cashPointLocation', 'Cash Point Location')}
                  items={locations}
                  selectedItem={locations.find((loc) => loc.id === field.value)}
                  onChange={({ selectedItem }) => field.onChange(selectedItem?.id)}
                  invalid={!!errors.location}
                  invalidText={errors.location?.message}
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

export default AddCashPointModal;
