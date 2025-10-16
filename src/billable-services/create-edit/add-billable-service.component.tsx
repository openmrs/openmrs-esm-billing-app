import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Button,
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
import { Add, TrashCan } from '@carbon/react/icons';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type TFunction } from 'i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCoreTranslation, navigate, ResponsiveWrapper, showSnackbar, useDebounce } from '@openmrs/esm-framework';
import {
  createBillableService,
  updateBillableService,
  useConceptsSearch,
  usePaymentModes,
  useServiceTypes,
} from '../billable-service.resource';
import { type BillableService, type ServiceConcept, type ServicePrice } from '../../types';
import styles from './add-billable-service.scss';

interface ServiceType {
  uuid: string;
  display: string;
}

interface PaymentModeForm {
  paymentMode: string;
  price: string | number | undefined;
}

interface BillableServiceFormData {
  name: string;
  shortName?: string;
  serviceType: ServiceType | null;
  concept?: ServiceConcept | null;
  payment: PaymentModeForm[];
}

interface AddBillableServiceProps {
  serviceToEdit?: BillableService;
  onClose: () => void;
  onServiceUpdated?: () => void;
  isModal?: boolean;
}

const DEFAULT_PAYMENT_OPTION: PaymentModeForm = { paymentMode: '', price: undefined };
const MAX_NAME_LENGTH = 19;

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

const AddBillableService: React.FC<AddBillableServiceProps> = ({
  serviceToEdit,
  onClose,
  onServiceUpdated,
  isModal = false,
}) => {
  const { t } = useTranslation();

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
    defaultValues: {
      name: serviceToEdit?.name || '',
      shortName: serviceToEdit?.shortName || '',
      serviceType: serviceToEdit?.serviceType || null,
      concept: serviceToEdit?.concept || null,
      payment: serviceToEdit?.servicePrices?.map((servicePrice: ServicePrice) => ({
        paymentMode: servicePrice.paymentMode?.uuid || '',
        price: servicePrice.price || undefined,
      })) || [DEFAULT_PAYMENT_OPTION],
    },
    resolver: zodResolver(billableServiceSchema),
  });
  const { fields, remove, append } = useFieldArray({ name: 'payment', control });

  const handleAppendPaymentMode = () => append(DEFAULT_PAYMENT_OPTION);
  const handleRemovePaymentMode = (index: number) => remove(index);

  const searchInputRef = useRef(null);

  const selectedConcept = useWatch({ control, name: 'concept' });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm.trim());
  const { searchResults, isSearching } = useConceptsSearch(debouncedSearchTerm);

  const handleNavigateToServiceDashboard = () =>
    navigate({
      to: window.getOpenmrsSpaBase() + 'billable-services',
    });

  useEffect(() => {
    if (serviceToEdit && !isLoadingPaymentModes && !isLoadingServiceTypes) {
      reset({
        name: serviceToEdit.name || '',
        shortName: serviceToEdit.shortName || '',
        serviceType: serviceToEdit.serviceType || null,
        concept: serviceToEdit.concept || null,
        payment: serviceToEdit.servicePrices.map((payment: ServicePrice) => ({
          paymentMode: payment.paymentMode?.uuid || '',
          price: payment.price || undefined,
        })),
      });
    }
  }, [serviceToEdit, isLoadingPaymentModes, reset, isLoadingServiceTypes]);

  const onSubmit = async (data: BillableServiceFormData) => {
    const payload = {
      name: data.name,
      shortName: data.shortName || '',
      serviceType: data.serviceType!.uuid,
      servicePrices: data.payment.map((payment) => {
        const mode = paymentModes.find((m) => m.uuid === payment.paymentMode);
        return {
          paymentMode: payment.paymentMode,
          name: mode?.name || 'Unknown',
          price: typeof payment.price === 'string' ? parseFloat(payment.price) : payment.price,
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
        title: t('billableService', 'Billable service'),
        subtitle: serviceToEdit
          ? t('updatedSuccessfully', 'Billable service updated successfully')
          : t('createdSuccessfully', 'Billable service created successfully'),
        kind: 'success',
      });

      if (onServiceUpdated) {
        onServiceUpdated();
      }
      handleNavigateToServiceDashboard();
    } catch (error) {
      showSnackbar({
        title: t('billPaymentError', 'Bill payment error'),
        kind: 'error',
        subtitle: error instanceof Error ? error.message : String(error),
      });
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
    <Form id="billable-service-form" className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={5}>
        <h4>
          {serviceToEdit
            ? t('editBillableService', 'Edit billable service')
            : t('addBillableService', 'Add billable service')}
        </h4>
        <section>
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
                    id="serviceName"
                    type="text"
                    labelText={t('serviceName', 'Service name')}
                    placeholder={t('enterServiceName', 'Enter service name')}
                    maxLength={MAX_NAME_LENGTH}
                    invalid={!!errors.name}
                    invalidText={errors.name?.message}
                  />
                </Layer>
              )}
            />
          )}
        </section>
        <section>
          <Controller
            name="shortName"
            control={control}
            render={({ field }) => (
              <Layer>
                <TextInput
                  {...field}
                  value={field.value || ''}
                  id="serviceShortName"
                  type="text"
                  labelText={t('shortName', 'Short name')}
                  placeholder={t('enterServiceShortName', 'Enter service short name')}
                  maxLength={MAX_NAME_LENGTH}
                  invalid={!!errors.shortName}
                  invalidText={errors.shortName?.message}
                />
              </Layer>
            )}
          />
        </section>
        <section>
          <FormLabel className={styles.conceptLabel}>{t('associatedConcept', 'Associated concept')}</FormLabel>
          <ResponsiveWrapper>
            <Search
              ref={searchInputRef}
              id="conceptsSearch"
              labelText={t('associatedConcept', 'Associated concept')}
              placeholder={t('searchConcepts', 'Search associated concept')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              onClear={() => {
                setSearchTerm('');
                setValue('concept', null);
              }}
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
                      role="menuitem"
                      className={styles.service}
                      key={searchResult.uuid}
                      onClick={() => {
                        setValue('concept', searchResult);
                        setSearchTerm('');
                      }}>
                      {searchResult.display}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <Layer>
                <Tile className={styles.emptyResults}>
                  <span>{t('noResultsFor', 'No results for {searchTerm}', { searchTerm: debouncedSearchTerm })}</span>
                </Tile>
              </Layer>
            );
          })()}
        </section>
        <section>
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
        </section>
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
                        onChange={({ selectedItem }) => field.onChange(selectedItem.uuid)}
                        titleText={t('paymentMode', 'Payment mode')}
                        label={t('selectPaymentMode', 'Select payment mode')}
                        items={paymentModes ?? []}
                        itemToString={(item) => (item ? item.name : '')}
                        selectedItem={paymentModes.find((mode) => mode.uuid === field.value)}
                        invalid={!!errors?.payment?.[index]?.paymentMode}
                        invalidText={errors?.payment?.[index]?.paymentMode?.message}
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
                        id={`price-${index}`}
                        invalid={!!errors?.payment?.[index]?.price}
                        invalidText={errors?.payment?.[index]?.price?.message}
                        label={t('sellingPrice', 'Selling price')}
                        placeholder={t('enterSellingPrice', 'Enter selling price')}
                        min={0}
                        step={0.01}
                        value={field.value ?? ''}
                        onChange={(_, { value }) => {
                          const numValue = value === '' || value === undefined ? undefined : Number(value);
                          field.onChange(numValue);
                        }}
                      />
                    </Layer>
                  )}
                />
                <div className={styles.removeButtonContainer}>
                  <TrashCan onClick={() => handleRemovePaymentMode(index)} className={styles.removeButton} size={20} />
                </div>
              </div>
            ))}
            <Button
              kind="tertiary"
              type="button"
              onClick={handleAppendPaymentMode}
              className={styles.paymentButtons}
              renderIcon={(props) => <Add size={24} {...props} />}
              iconDescription={t('add', 'Add')}>
              {t('addPaymentOption', 'Add payment option')}
            </Button>
            {getPaymentErrorMessage() && <div className={styles.errorMessage}>{getPaymentErrorMessage()}</div>}
          </div>
        </section>
      </Stack>
      {!isModal && (
        <section>
          <Button kind="secondary" onClick={onClose}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="submit">{getCoreTranslation('save')}</Button>
        </section>
      )}
    </Form>
  );
};

export default AddBillableService;
