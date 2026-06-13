import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  Form,
  ModalBody,
  ModalFooter,
  Search,
  Layer,
  InlineLoading,
  Tile,
  FormLabel,
  Section,
  Dropdown,
  TextInput,
} from '@carbon/react';
import { showSnackbar, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import styles from './charge-items-form.scss';
import { type StockItem } from '../types/index';
import { useFetchChargeItems } from '../billing.resource';
import { Add, TrashCan, WarningFilled } from '@carbon/react/icons';
import { z } from 'zod';
import {
  createBillableCommodity,
  updateBillableCommodity,
  usePaymentModes,
} from '../billable-services/billable-service.resource';
import { zodResolver } from '@hookform/resolvers/zod';
import { handleMutate, apiBasePath } from '../constants';

const DEFAULT_PAYMENT_OPTION = { paymentMode: '', price: 0 };

interface AddBillableStockProps {
  editingItem?: any;
  onClose: () => void;
}

const AddBillableStock: React.FC<AddBillableStockProps> = ({ onClose, editingItem }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm);

  const { searchResults, error, isLoading } = useFetchChargeItems(debouncedSearchTerm);
  const searchInputRef = useRef(null);
  const handleSearchTermChange = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);
  const { paymentModes, isLoadingPaymentModes } = usePaymentModes();
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

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      search: editingItem?.item,
      payment: editingItem?.servicePrices || [DEFAULT_PAYMENT_OPTION],
      serviceType: editingItem?.serviceType,
    },
    resolver: zodResolver(paymentFormSchema),
  });

  const { fields, remove, append } = useFieldArray({ name: 'payment', control: control });

  const handleAppendPaymentMode = useCallback(() => append(DEFAULT_PAYMENT_OPTION), [append]);
  const handleRemovePaymentMode = useCallback((index) => remove(index), [remove]);

  const handleChargeItemChange = useCallback((selectedItem: any) => {
    setSelectedItem(selectedItem);
  }, []);

  const getPaymentErrorMessage = () => {
    const paymentError = errors.payment;
    if (paymentError && typeof paymentError.message === 'string') {
      return paymentError.message;
    }
    return null;
  };

  useEffect(() => {
    if (editingItem) {
      reset({
        search: editingItem.uuid || '',
        payment: [
          {
            paymentMode: editingItem.paymentMode?.uuid || '',
            price: editingItem.price || 0,
          },
        ],
      });
    }
  }, [editingItem, reset]);

  const onSubmit = (data) => {
    if (!selectedItem && !editingItem?.item) {
      showSnackbar({
        title: t('missingItem', 'Missing item'),
        subtitle: t(
          editingItem ? 'pleaseSelectOrRetainAnItem' : 'pleaseSelectAnItem',
          editingItem
            ? 'Please select or retain the existing commodity before submitting'
            : 'Please select a commodity before submitting',
        ),
        kind: 'error',
        timeoutInMs: 3000,
      });
      return;
    }

    const servicePrices = data.payment.map((payment) => {
      const mode = paymentModes.find((m) => m.uuid === payment.paymentMode);
      return {
        name: mode?.name || 'Unknown',
        price: parseFloat(payment.price),
        paymentMode: {
          uuid: payment.paymentMode,
          name: mode?.name || '',
        },
      };
    });

    const payload = {
      name: servicePrices[0]?.name,
      price: servicePrices[0]?.price ?? 0,
      paymentMode: servicePrices[0]?.paymentMode,
      item: selectedItem?.uuid,
    };

    const saveAction = editingItem
      ? updateBillableCommodity(editingItem.uuid, payload)
      : createBillableCommodity(payload);

    saveAction.then(
      (resp) => {
        showSnackbar({
          title: t('billableCommodity', 'Billable Commodity'),
          subtitle: editingItem
            ? t('updatedSuccessfully', 'Billable commodity updated successfully')
            : t('createdSuccessfully', 'Billable commodity created successfully'),
          kind: 'success',
          timeoutInMs: 3000,
        });
        handleMutate(`${apiBasePath}cashierItemPrice`);
        onClose();
      },
      (error) => {
        showSnackbar({
          title: t('commodityError', 'Commodity error'),
          kind: 'error',
          subtitle: error?.message,
          timeoutInMs: 3000,
        });
      },
    );
  };

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <ModalBody hasScrollingContent={true}>
        <Section>
          {editingItem && editingItem != null ? (
            <Layer>
              <TextInput
                id="commodityName"
                type="text"
                labelText={t('commodity', 'Commodity Name')}
                size="md"
                value={editingItem?.item || 'null'}
                onChange={() => {
                  if (editingItem) {
                    setSelectedItem(editingItem.item);
                  }
                }}
              />
            </Layer>
          ) : (
            <div>
              <FormLabel className={styles.conceptLabel}>Search for commodity</FormLabel>
              <Controller
                name="search"
                control={control}
                render={({ field: { onChange, value, onBlur } }) => (
                  <ResponsiveWrapper isTablet={isTablet}>
                    <Search
                      ref={searchInputRef}
                      size="md"
                      id="search"
                      labelText={t('enterItem', 'Billable Commodity')}
                      placeholder={t('searchCommodity', 'Search for commodity')}
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
                        setSelectedItem(null);
                      }}
                      value={(() => {
                        if (selectedItem) {
                          return selectedItem.drugName;
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
                if (!debouncedSearchTerm || selectedItem) return null;
                if (isLoading)
                  return <InlineLoading className={styles.loader} description={t('searching', 'Searching') + '...'} />;
                if (searchResults && searchResults.length) {
                  return (
                    <ul className={styles.conceptsList}>
                      {searchResults?.map((searchResult, index) => (
                        <li
                          role="menuitem"
                          className={styles.service}
                          key={index}
                          onClick={() => handleChargeItemChange(searchResult)}>
                          {searchResult.drugName}
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
            </div>
          )}
        </Section>
        <Section>
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
        </Section>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.submitButton} type="submit">
          <span>{t('submit', 'Submit')}</span>
        </Button>
      </ModalFooter>
    </Form>
  );
};

function ResponsiveWrapper({ children, isTablet }: { children: React.ReactNode; isTablet: boolean }) {
  return isTablet ? <Layer>{children}</Layer> : <>{children}</>;
}

export default AddBillableStock;
