import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  ButtonSet,
  ComboBox,
  Dropdown,
  Form,
  FormLabel,
  InlineLoading,
  Layer,
  NumberInput,
  Search,
  Stack,
  TextInput,
  Tile,
} from '@carbon/react';
import { type TFunction } from 'i18next';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Add, TrashCan } from '@carbon/react/icons';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getCoreTranslation,
  ResponsiveWrapper,
  showSnackbar,
  useDebounce,
  useLayoutType,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import type { BillableService, ServicePrice } from '../../types';
import {
  createBillableService,
  updateBillableService,
  useConceptsSearch,
  usePaymentModes,
  useServiceTypes,
} from '../billable-service.resource';
import styles from './billable-service-form.scss';

export interface BillableServiceFormWorkspaceProps {
  serviceToEdit?: BillableService;
  closeWorkspace: () => void;
  closeWorkspaceWithSavedChanges?: () => void;
  promptBeforeClosing?: (testFcn: () => boolean) => void;
  onWorkspaceClose?: () => void;
}

interface BillableServiceFormData {
  name: string;
  payment: PaymentModeForm[];
  serviceType: ServiceType | null;
  concept?: { uuid: string; display: string } | null;
  shortName?: string;
}

interface PaymentModeForm {
  paymentMode: string;
  price: string | number | undefined;
}

interface ServiceType {
  uuid: string;
  display: string;
}

const DEFAULT_PAYMENT_OPTION: PaymentModeForm = { paymentMode: '', price: '' };
const MAX_NAME_LENGTH = 255;

/**
 * Transforms a BillableService into form data structure
 * Centralizes the mapping logic to avoid duplication between defaultValues and reset()
 * Exported for testing
 */
export const transformServiceToFormData = (service?: BillableService): BillableServiceFormData => {
  if (!service) {
    return {
      name: '',
      shortName: '',
      serviceType: null,
      concept: null,
      payment: [DEFAULT_PAYMENT_OPTION],
    };
  }

  return {
    name: service.name || '',
    shortName: service.shortName || '',
    serviceType: service.serviceType || null,
    concept: service.concept ? { uuid: service.concept.uuid, display: service.concept.display } : null,
    payment: service.servicePrices?.map((servicePrice: ServicePrice) => ({
      paymentMode: servicePrice.paymentMode?.uuid || '',
      price: servicePrice.price ?? '',
    })) || [DEFAULT_PAYMENT_OPTION],
  };
};

/**
 * Normalizes price value from form (string | number | undefined) to number
 * Handles Carbon NumberInput which can return either type
 * Exported for testing
 */
export const normalizePrice = (price: string | number | undefined): number => {
  if (typeof price === 'number') {
    return price;
  }
  return parseFloat(String(price));
};

export const getAvailablePaymentModes = <T extends { uuid: string }>(
  allModes: T[],
  allFields: PaymentModeForm[],
  currentIndex: number,
  currentValue: string,
): T[] => {
  const selectedUUIDs = allFields.map((f, i) => (i !== currentIndex ? f.paymentMode : null)).filter(Boolean);

  return allModes.filter((mode) => !selectedUUIDs.includes(mode.uuid) || mode.uuid === currentValue);
};

const createBillableServiceSchema = (t: TFunction) => {
  const servicePriceSchema = z.object({
    paymentMode: z
      .string({
        required_error: t('paymentModeRequired', 'Payment mode is required'),
      })
      .trim()
      .min(1, t('paymentModeRequired', 'Payment mode is required')),
    price: z.union([z.number(), z.string(), z.undefined()]).superRefine((val, ctx) => {
      if (val === undefined || val === null || val === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('priceIsRequired', 'Price is required'),
        });
        return;
      }

      const numValue = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(numValue) || numValue <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('priceMustBePositive', 'Price must be greater than 0'),
        });
      }
    }),
  });

  return z.object({
    name: z
      .string({
        required_error: t('serviceNameRequired', 'Service name is required'),
      })
      .trim()
      .min(1, t('serviceNameRequired', 'Service name is required'))
      .max(
        MAX_NAME_LENGTH,
        t('serviceNameExceedsLimit', 'Service name cannot exceed {{MAX_NAME_LENGTH}} characters', {
          MAX_NAME_LENGTH,
        }),
      ),
    shortName: z
      .string()
      .trim()
      .max(
        MAX_NAME_LENGTH,
        t('shortNameExceedsLimit', 'Short name cannot exceed {{MAX_NAME_LENGTH}} characters', { MAX_NAME_LENGTH }),
      )
      .optional(),
    serviceType: z
      .object({
        uuid: z.string(),
        display: z.string(),
      })
      .nullable()
      .refine((val) => val !== null, t('serviceTypeRequired', 'Service type is required')),
    concept: z
      .object({
        uuid: z.string(),
        display: z.string(),
      })
      .nullable()
      .optional(),
    payment: z.array(servicePriceSchema).min(1, t('paymentOptionRequired', 'At least one payment option is required')),
  });
};
const BillableServiceFormWorkspace: React.FC<Workspace2DefinitionProps<BillableServiceFormWorkspaceProps>> = ({
  workspaceProps: { serviceToEdit, closeWorkspaceWithSavedChanges, onWorkspaceClose },
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const { paymentModes, isLoadingPaymentModes } = usePaymentModes();
  const { serviceTypes, isLoadingServiceTypes } = useServiceTypes();

  const billableServiceSchema = useMemo(() => createBillableServiceSchema(t), [t]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<BillableServiceFormData>({
    mode: 'all',
    defaultValues: transformServiceToFormData(serviceToEdit),
    resolver: zodResolver(billableServiceSchema),
  });
  const { fields, remove, append } = useFieldArray({ name: 'payment', control });

  const handleAppendPaymentMode = () => append(DEFAULT_PAYMENT_OPTION);
  const handleRemovePaymentMode = (index: number) => remove(index);

  const searchInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedConcept = useWatch({ control, name: 'concept' });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm.trim());
  const { searchResults, isSearching } = useConceptsSearch(debouncedSearchTerm);

  // Re-initialize form when editing and dependencies load
  // Needed because serviceTypes/paymentModes may not be available during initial render
  useEffect(() => {
    if (serviceToEdit && !isLoadingPaymentModes && !isLoadingServiceTypes) {
      reset(transformServiceToFormData(serviceToEdit));
    }
  }, [serviceToEdit, isLoadingPaymentModes, isLoadingServiceTypes, reset]);

  const onSubmit = async (data: BillableServiceFormData) => {
    setIsSubmitting(true);

    const payload = {
      name: data.name,
      shortName: data.shortName ?? '',
      serviceType: data.serviceType!.uuid,
      servicePrices: data.payment.map((payment) => {
        const mode = paymentModes.find((m) => m.uuid === payment.paymentMode);
        return {
          paymentMode: payment.paymentMode,
          name: mode?.name || 'Unknown',
          price: normalizePrice(payment.price),
        };
      }),
      serviceStatus: 'ENABLED',
      concept: data.concept?.uuid,
    };

    try {
      if (serviceToEdit) {
        await updateBillableService(serviceToEdit.uuid, payload);
      } else {
        await createBillableService(payload);
      }

      showSnackbar({
        title: serviceToEdit
          ? t('billableServiceUpdated', 'Billable service updated')
          : t('billableServiceCreated', 'Billable service created'),
        subtitle: serviceToEdit
          ? t('billableServiceUpdatedSuccessfully', 'Billable service updated successfully')
          : t('billableServiceCreatedSuccessfully', 'Billable service created successfully'),
        kind: 'success',
      });

      // Call onWorkspaceClose callback to refresh data in parent component
      if (onWorkspaceClose) {
        onWorkspaceClose();
      }

      // Close the workspace
      if (closeWorkspaceWithSavedChanges) {
        closeWorkspaceWithSavedChanges();
      } else {
        closeWorkspace({ discardUnsavedChanges: true });
      }
    } catch (error) {
      showSnackbar({
        title: t('billPaymentError', 'Bill payment error'),
        kind: 'error',
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentErrorMessage = () => {
    const paymentError = errors.payment;
    if (paymentError && typeof paymentError.message === 'string') {
      return paymentError.message;
    }
    return null;
  };

  if (isLoadingPaymentModes || isLoadingServiceTypes) {
    return (
      <InlineLoading
        status="active"
        iconDescription={t('loadingDescription', 'Loading')}
        description={t('loading', 'Loading data') + '...'}
      />
    );
  }

  return (
    <Workspace2
      title={
        serviceToEdit
          ? t('editBillableService', 'Edit billable service')
          : t('addBillableService', 'Add billable service')
      }>
      <Form
        aria-label={t('billableServiceForm', 'Billable service form')}
        className={styles.form}
        id="billable-service-form"
        onSubmit={handleSubmit(onSubmit)}>
        <Stack className={styles.stack} gap={5}>
          <div className={styles.formGroup}>
            {serviceToEdit ? (
              <FormLabel className={styles.serviceNameLabel}>{serviceToEdit.name}</FormLabel>
            ) : (
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Layer>
                    <TextInput
                      {...field}
                      enableCounter
                      id="serviceName"
                      invalid={!!errors.name}
                      invalidText={errors.name?.message}
                      labelText={t('serviceName', 'Service name')}
                      maxCount={MAX_NAME_LENGTH}
                      placeholder={t('enterServiceName', 'Enter service name')}
                      type="text"
                    />
                  </Layer>
                )}
              />
            )}
          </div>
          <div>
            <Controller
              name="shortName"
              control={control}
              render={({ field }) => (
                <Layer>
                  <TextInput
                    {...field}
                    enableCounter
                    id="serviceShortName"
                    invalid={!!errors.shortName}
                    invalidText={errors.shortName?.message}
                    labelText={t('shortName', 'Short name')}
                    maxCount={MAX_NAME_LENGTH}
                    placeholder={t('enterServiceShortName', 'Enter service short name')}
                    type="text"
                    value={field.value || ''}
                  />
                </Layer>
              )}
            />
          </div>
          <div>
            <FormLabel className={styles.conceptLabel}>{t('associatedConcept', 'Associated concept')}</FormLabel>
            <ResponsiveWrapper>
              <Search
                id="conceptsSearch"
                labelText={t('associatedConcept', 'Associated concept')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                onClear={() => {
                  setSearchTerm('');
                  setValue('concept', null);
                }}
                placeholder={t('searchConcepts', 'Search associated concept')}
                ref={searchInputRef}
                value={selectedConcept?.display || searchTerm}
              />
            </ResponsiveWrapper>

            {(() => {
              if (!debouncedSearchTerm || selectedConcept) {
                return null;
              }
              if (isSearching) {
                return <InlineLoading className={styles.loader} description={t('searching', 'Searching') + '...'} />;
              }
              if (searchResults && searchResults.length) {
                return (
                  <ul className={styles.conceptsList}>
                    {searchResults?.map((searchResult) => (
                      <li
                        className={styles.service}
                        key={searchResult.concept.uuid}
                        onClick={() => {
                          setValue('concept', {
                            uuid: searchResult.concept.uuid,
                            display: searchResult.display,
                          });
                          setSearchTerm('');
                        }}
                        role="menuitem">
                        {searchResult.display}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <Layer>
                  <Tile className={styles.emptyResults}>
                    <span>
                      {t('noResultsFor', 'No results for {{searchTerm}}', { searchTerm: debouncedSearchTerm })}
                    </span>
                  </Tile>
                </Layer>
              );
            })()}
          </div>
          <div>
            <Controller
              name="serviceType"
              control={control}
              render={({ field }) => (
                <Layer>
                  <ComboBox
                    id="serviceType"
                    items={serviceTypes ?? []}
                    titleText={t('serviceType', 'Service type')}
                    itemToString={(item: ServiceType) => item?.display || ''}
                    selectedItem={field.value}
                    onChange={({ selectedItem }: { selectedItem: ServiceType | null }) => {
                      field.onChange(selectedItem);
                    }}
                    placeholder={t('selectServiceType', 'Select service type')}
                    invalid={!!errors.serviceType}
                    invalidText={errors.serviceType?.message}
                  />
                </Layer>
              )}
            />
          </div>
          <section>
            <div>
              {fields.map((field, index) => (
                <div key={field.id} className={styles.paymentMethodContainer}>
                  <Controller
                    control={control}
                    name={`payment.${index}.paymentMode`}
                    render={({ field }) => (
                      <Layer>
                        <Dropdown
                          id={`paymentMode-${index}`}
                          invalid={!!errors?.payment?.[index]?.paymentMode}
                          invalidText={errors?.payment?.[index]?.paymentMode?.message}
                          items={getAvailablePaymentModes(paymentModes, fields, index, field.value)}
                          itemToString={(item) => (item ? item.name : '')}
                          label={t('selectPaymentMode', 'Select payment mode')}
                          onChange={({ selectedItem }) => field.onChange(selectedItem.uuid)}
                          selectedItem={paymentModes.find((mode) => mode.uuid === field.value)}
                          titleText={t('paymentMode', 'Payment mode')}
                        />
                      </Layer>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`payment.${index}.price`}
                    render={({ field }) => (
                      <Layer>
                        <NumberInput
                          allowEmpty
                          disableWheel
                          id={`price-${index}`}
                          invalid={!!errors?.payment?.[index]?.price}
                          invalidText={errors?.payment?.[index]?.price?.message}
                          label={t('sellingPrice', 'Selling price')}
                          min={0}
                          onChange={(_, { value }) => {
                            field.onChange(value === '' || value === undefined ? '' : value);
                          }}
                          placeholder={t('enterSellingPrice', 'Enter selling price')}
                          step={0.01}
                          value={field.value === undefined || field.value === null ? '' : field.value}
                        />
                      </Layer>
                    )}
                  />
                  <div className={styles.removeButtonContainer}>
                    <TrashCan
                      onClick={() => handleRemovePaymentMode(index)}
                      className={styles.removeButton}
                      size={20}
                    />
                  </div>
                </div>
              ))}
              <Button
                className={styles.paymentButtons}
                iconDescription={t('add', 'Add')}
                kind="tertiary"
                onClick={handleAppendPaymentMode}
                renderIcon={(props) => <Add size={24} {...props} />}
                type="button">
                {t('addPaymentOption', 'Add payment option')}
              </Button>
              {getPaymentErrorMessage() && <div className={styles.errorMessage}>{getPaymentErrorMessage()}</div>}
            </div>
          </section>
        </Stack>
        <ButtonSet className={isTablet ? styles.tablet : styles.desktop}>
          <Button className={styles.button} kind="secondary" disabled={isSubmitting} onClick={closeWorkspace}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button className={styles.button} kind="primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <InlineLoading description={t('saving', 'Saving') + '...'} /> : getCoreTranslation('save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default BillableServiceFormWorkspace;
