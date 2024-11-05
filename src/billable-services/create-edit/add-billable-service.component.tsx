import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Button,
  ComboBox,
  Dropdown,
  Form,
  FormLabel,
  InlineLoading,
  Layer,
  Search,
  TextInput,
  Tile,
} from '@carbon/react';
import { navigate, showSnackbar, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import { Add, TrashCan, WarningFilled } from '@carbon/react/icons';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createBillableSerice,
  updateBillableService,
  useConceptsSearch,
  usePaymentModes,
  useServiceTypes,
} from '../billable-service.resource';
import { type ServiceConcept } from '../../types';
import styles from './add-billable-service.scss';

type PaymentMode = {
  paymentMode: string;
  price: string | number;
};

type PaymentModeFormValue = {
  payment: Array<PaymentMode>;
};

const servicePriceSchema = z.object({
  paymentMode: z.string().refine((value) => !!value, 'Payment method is required'),
  price: z.union([
    z.number().refine((value) => !!value, 'Price is required'),
    z.string().refine((value) => !!value, 'Price is required'),
  ]),
});

const paymentFormSchema = z.object({
  payment: z.array(servicePriceSchema).min(1, 'At least one payment option is required'),
});

const DEFAULT_PAYMENT_OPTION = { paymentMode: '', price: 0 };

const AddBillableService: React.FC<{ editingService?: any; onClose: () => void }> = ({ editingService, onClose }) => {
  const { t } = useTranslation();

  const { paymentModes, isLoading: isLoadingPaymentModes } = usePaymentModes();
  const { serviceTypes, isLoading: isLoadingServicesTypes } = useServiceTypes();
  const [billableServicePayload, setBillableServicePayload] = useState(editingService || {});

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<any>({
    mode: 'all',
    defaultValues: {
      name: editingService?.name,
      serviceShortName: editingService?.shortName,
      serviceType: editingService?.serviceType,
      conceptsSearch: editingService?.concept,
      payment: editingService?.servicePrices || [DEFAULT_PAYMENT_OPTION],
    },
    resolver: zodResolver(paymentFormSchema),
    shouldUnregister: !editingService,
  });
  const { fields, remove, append } = useFieldArray({ name: 'payment', control: control });

  const handleAppendPaymentMode = useCallback(() => append(DEFAULT_PAYMENT_OPTION), [append]);
  const handleRemovePaymentMode = useCallback((index) => remove(index), [remove]);

  const isTablet = useLayoutType() === 'tablet';
  const searchInputRef = useRef(null);
  const handleSearchTermChange = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);

  const [selectedConcept, setSelectedConcept] = useState<ServiceConcept>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const { searchResults, isSearching } = useConceptsSearch(debouncedSearchTerm);
  const handleConceptChange = useCallback((selectedConcept: any) => {
    setSelectedConcept(selectedConcept);
  }, []);

  const handleNavigateToServiceDashboard = () =>
    navigate({
      to: window.getOpenmrsSpaBase() + 'billable-services',
    });

  useEffect(() => {
    if (editingService && !isLoadingPaymentModes) {
      setBillableServicePayload(editingService);
      setValue('serviceName', editingService.name || '');
      setValue('shortName', editingService.shortName || '');
      setValue('serviceType', editingService.serviceType || '');
      setValue(
        'payment',
        editingService.servicePrices.map((payment) => ({
          paymentMode: payment.paymentMode?.uuid || '',
          price: payment.price,
        })),
      );
      setValue('conceptsSearch', editingService.concept);

      if (editingService.concept) {
        setSelectedConcept(editingService.concept);
      }
    }
  }, [editingService, paymentModes, serviceTypes, setValue]);
  const MAX_NAME_LENGTH = 19;
  const onSubmit = (data) => {
    const payload = {
      name: billableServicePayload.name.substring(0, MAX_NAME_LENGTH),
      shortName: billableServicePayload.shortName.substring(0, MAX_NAME_LENGTH),
      serviceType: billableServicePayload.serviceType.uuid,
      servicePrices: data.payment.map((payment) => {
        const mode = paymentModes.find((m) => m.uuid === payment.paymentMode);
        return {
          paymentMode: payment.paymentMode,
          name: mode?.name || 'Unknown',
          price: parseFloat(payment.price),
        };
      }),
      serviceStatus: 'ENABLED',
      concept: selectedConcept?.uuid,
    };

    const saveAction = editingService
      ? updateBillableService(editingService.uuid, payload)
      : createBillableSerice(payload);

    saveAction.then(
      (resp) => {
        showSnackbar({
          title: t('billableService', 'Billable service'),
          subtitle: editingService
            ? t('updatedSuccessfully', 'Billable service updated successfully')
            : t('createdSuccessfully', 'Billable service created successfully'),
          kind: 'success',
          timeoutInMs: 3000,
        });
        onClose();
        handleNavigateToServiceDashboard();
      },
      (error) => {
        showSnackbar({ title: t('billPaymentError', 'Bill payment error'), kind: 'error', subtitle: error?.message });
      },
    );
  };

  const getPaymentErrorMessage = () => {
    const paymentError = errors.payment;
    if (paymentError && typeof paymentError.message === 'string') {
      return paymentError.message;
    }
    return null;
  };

  if (isLoadingPaymentModes && isLoadingServicesTypes) {
    return (
      <InlineLoading
        status="active"
        iconDescription={t('loadingDescription', 'Loading')}
        description={t('loading', 'Loading data...')}
      />
    );
  }

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <h4>
        {editingService
          ? t('editBillableServices', 'Edit Billable Services')
          : t('addBillableServices', 'Add Billable Services')}
      </h4>
      <section className={styles.section}>
        <Layer>
          <TextInput
            id="serviceName"
            type="text"
            labelText={t('serviceName', 'Service Name')}
            size="md"
            value={billableServicePayload.name || ''}
            onChange={(e) => {
              const newName = e.target.value.substring(0, MAX_NAME_LENGTH);
              setBillableServicePayload({
                ...billableServicePayload,
                name: newName,
              });
            }}
            placeholder="Enter service name"
            maxLength={MAX_NAME_LENGTH}
          />
          {billableServicePayload.name?.length >= MAX_NAME_LENGTH && (
            <span className={styles.errorMessage}>
              {t('serviceNameExceedsLimit', 'Service Name exceeds the character limit of {{MAX_NAME_LENGTH}}.', {
                MAX_NAME_LENGTH,
              })}
            </span>
          )}
        </Layer>
      </section>
      <section className={styles.section}>
        <Layer>
          <TextInput
            id="serviceShortName"
            type="text"
            labelText={t('serviceShortName', 'Short Name')}
            size="md"
            value={billableServicePayload.shortName || ''}
            onChange={(e) => {
              const newShortName = e.target.value.substring(0, MAX_NAME_LENGTH);
              setBillableServicePayload({
                ...billableServicePayload,
                shortName: newShortName,
              });
            }}
            placeholder="Enter service short name"
            maxLength={MAX_NAME_LENGTH}
          />
          {billableServicePayload.shortName?.length >= MAX_NAME_LENGTH && (
            <span className={styles.errorMessage}>
              {t('shortNameExceedsLimit', 'Short Name exceeds the character limit of {{MAX_NAME_LENGTH}}.', {
                MAX_NAME_LENGTH,
              })}
            </span>
          )}
        </Layer>
      </section>
      <section>
        <FormLabel className={styles.conceptLabel}>Associated Concept</FormLabel>
        <Controller
          name="search"
          control={control}
          render={({ field: { onChange, value, onBlur } }) => (
            <ResponsiveWrapper isTablet={isTablet}>
              <Search
                ref={searchInputRef}
                size="md"
                id="conceptsSearch"
                labelText={t('enterConcept', 'Associated concept')}
                placeholder={t('searchConcepts', 'Search associated concept')}
                className={errors?.search && styles.serviceError}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  onChange(e);
                  handleSearchTermChange(e);
                }}
                renderIcon={errors?.search && <WarningFilled />}
                onBlur={onBlur}
                onClear={() => {
                  setSearchTerm('');
                  setSelectedConcept(null);
                }}
                value={(() => {
                  if (selectedConcept) {
                    return selectedConcept.display;
                  }
                  if (debouncedSearchTerm) {
                    return value;
                  }
                })()}
              />
            </ResponsiveWrapper>
          )}
        />

        {(() => {
          if (!debouncedSearchTerm || selectedConcept) return null;
          if (isSearching)
            return <InlineLoading className={styles.loader} description={t('searching', 'Searching') + '...'} />;
          if (searchResults && searchResults.length) {
            return (
              <ul className={styles.conceptsList}>
                {/*TODO: use uuid instead of index as the key*/}
                {searchResults?.map((searchResult, index) => (
                  <li
                    role="menuitem"
                    className={styles.service}
                    key={index}
                    onClick={() => handleConceptChange(searchResult)}>
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
                  {t('noResultsFor', 'No results for')} <strong>"{debouncedSearchTerm}"</strong>
                </span>
              </Tile>
            </Layer>
          );
        })()}
      </section>
      <section className={styles.section}>
        <Layer>
          <ComboBox
            id="serviceType"
            items={serviceTypes ?? []}
            titleText={t('serviceType', 'Service Type')}
            itemToString={(item) => item?.display || ''}
            selectedItem={billableServicePayload.serviceType || null}
            onChange={({ selectedItem }) => {
              setBillableServicePayload({
                ...billableServicePayload,
                display: selectedItem?.display,
                serviceType: selectedItem,
              });
            }}
            placeholder="Select service type"
            required
          />
        </Layer>
      </section>

      <section>
        <div className={styles.container}>
          {fields.map((field, index) => (
            <div key={field.id} className={styles.paymentMethodContainer}>
              <Controller
                control={control}
                name={`payment.${index}.paymentMode`}
                render={({ field }) => (
                  <Layer>
                    <Dropdown
                      onChange={({ selectedItem }) => field.onChange(selectedItem.uuid)}
                      titleText={t('paymentMode', 'Payment Mode')}
                      label={t('selectPaymentMethod', 'Select payment method')}
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
                    <TextInput
                      {...field}
                      invalid={!!errors?.payment?.[index]?.price}
                      invalidText={errors?.payment?.[index]?.price?.message}
                      labelText={t('sellingPrice', 'Selling Price')}
                      placeholder={t('sellingAmount', 'Enter selling price')}
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
            size="md"
            onClick={handleAppendPaymentMode}
            className={styles.paymentButtons}
            renderIcon={(props) => <Add size={24} {...props} />}
            iconDescription="Add">
            {t('addPaymentOptions', 'Add payment option')}
          </Button>
          {getPaymentErrorMessage() && <div className={styles.errorMessage}>{getPaymentErrorMessage()}</div>}
        </div>
      </section>

      <section>
        <Button kind="secondary" onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button type="submit" disabled={!isValid || Object.keys(errors).length > 0}>
          {t('save', 'Save')}
        </Button>
      </section>
    </Form>
  );
};

function ResponsiveWrapper({ children, isTablet }: { children: React.ReactNode; isTablet: boolean }) {
  return isTablet ? <Layer>{children} </Layer> : <>{children}</>;
}

export default AddBillableService;
