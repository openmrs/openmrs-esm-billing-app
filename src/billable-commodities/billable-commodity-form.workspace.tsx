import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
  Button,
  ButtonSet,
  Form,
  InlineLoading,
  Layer,
  NumberInput,
  Search,
  Stack,
  Tile,
  Dropdown,
  TextInput,
  FormLabel,
} from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type TFunction } from 'i18next';
import {
  getCoreTranslation,
  showSnackbar,
  useDebounce,
  useLayoutType,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import type { StockItem } from '../types';
import { useFetchChargeItems } from '../billing.resource';
import {
  createBillableCommodities,
  updateBillableCommodity,
  usePaymentModes,
} from '../billable-services/billable-service.resource';
import styles from './charge-items-form.scss';

export interface BillableCommodityFormWorkspaceProps {
  itemToEdit?: any;
  closeWorkspace: () => void;
  closeWorkspaceWithSavedChanges?: () => void;
  promptBeforeClosing?: (testFcn: () => boolean) => void;
  onWorkspaceClose?: () => void;
}

interface PaymentModeForm {
  paymentMode: string;
  price: string | number | undefined;
}

interface BillableCommodityFormData {
  search?: string;
  payment: PaymentModeForm[];
}

const DEFAULT_PAYMENT_OPTION: PaymentModeForm = { paymentMode: '', price: '' };

export const createBillableCommoditySchema = (t: TFunction) => {
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
    payment: z
      .array(servicePriceSchema)
      .min(1, t('paymentOptionRequired', 'At least one payment option is required'))
      .superRefine((payments, ctx) => {
        const selectedPaymentModes = new Set<string>();

        payments.forEach(({ paymentMode }, index) => {
          if (!paymentMode || selectedPaymentModes.has(paymentMode)) {
            if (paymentMode) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [index, 'paymentMode'],
                message: t('paymentModeMustBeUnique', 'Each payment mode can only be selected once'),
              });
            }
            return;
          }

          selectedPaymentModes.add(paymentMode);
        });
      }),
  });
};

/**
 * Normalizes price value from form (string | number | undefined) to number
 * Handles Carbon NumberInput which can return either type
 */
export const normalizePrice = (price: string | number | undefined): number => {
  if (typeof price === 'number') {
    return price;
  }
  return parseFloat(String(price));
};

const BillableCommodityFormWorkspace: React.FC<Workspace2DefinitionProps<BillableCommodityFormWorkspaceProps>> = ({
  workspaceProps: { itemToEdit, closeWorkspaceWithSavedChanges, onWorkspaceClose },
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const { paymentModes, isLoadingPaymentModes } = usePaymentModes();

  const billableCommoditySchema = useMemo(() => createBillableCommoditySchema(t), [t]);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<BillableCommodityFormData>({
    mode: 'all',
    defaultValues: {
      search: itemToEdit?.item || '',
      payment: itemToEdit?.servicePrices || [DEFAULT_PAYMENT_OPTION],
    },
    resolver: zodResolver(billableCommoditySchema),
  });
  const { fields, remove, append } = useFieldArray({ name: 'payment', control });

  const handleAppendPaymentMode = () => append(DEFAULT_PAYMENT_OPTION);
  const handleRemovePaymentMode = (index: number) => remove(index);

  const searchInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm.trim());
  const { searchResults, isLoading } = useFetchChargeItems(debouncedSearchTerm);

  // Re-initialize form when editing and dependencies load
  useEffect(() => {
    if (itemToEdit && !isLoadingPaymentModes) {
      reset({
        search: itemToEdit.uuid || '',
        payment: [
          {
            paymentMode: itemToEdit.paymentMode?.uuid || '',
            price: itemToEdit.price || 0,
          },
        ],
      });
    }
  }, [itemToEdit, isLoadingPaymentModes, reset]);

  const onSubmit = async (data: BillableCommodityFormData) => {
    if (!selectedItem && !itemToEdit?.item) {
      showSnackbar({
        title: t('missingItem', 'Missing item'),
        subtitle: t(
          itemToEdit ? 'pleaseSelectOrRetainAnItem' : 'pleaseSelectAnItem',
          itemToEdit
            ? 'Please select or retain the existing commodity before submitting'
            : 'Please select a commodity before submitting',
        ),
        kind: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    const payloads = data.payment.map((payment) => {
      const paymentMode = paymentModes.find((mode) => mode.uuid === payment.paymentMode);
      return {
        name: paymentMode?.name || 'Unknown',
        price: normalizePrice(payment.price),
        paymentMode: {
          uuid: payment.paymentMode,
          name: paymentMode?.name || '',
        },
        item: selectedItem?.uuid || itemToEdit?.item,
      };
    });

    try {
      if (itemToEdit) {
        await updateBillableCommodity(itemToEdit.uuid, payloads[0]);
      } else {
        await createBillableCommodities(payloads);
      }

      showSnackbar({
        title: itemToEdit
          ? t('billableCommodityUpdated', 'Billable commodity updated')
          : t('billableCommodityCreated', 'Billable commodity created'),
        subtitle: itemToEdit
          ? t('billableCommodityUpdatedSuccessfully', 'Billable commodity updated successfully')
          : t('billableCommodityCreatedSuccessfully', 'Billable commodity created successfully'),
        kind: 'success',
      });

      // Call onWorkspaceClose callback to refresh data in parent component
      await onWorkspaceClose?.();

      // Close the workspace
      if (closeWorkspaceWithSavedChanges) {
        closeWorkspaceWithSavedChanges();
      } else {
        closeWorkspace({ discardUnsavedChanges: true });
      }
    } catch (error) {
      showSnackbar({
        title: t('commodityError', 'Commodity error'),
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

  const title = itemToEdit
    ? t('editBillableCommodity', 'Edit billable commodity')
    : t('addBillableCommodity', 'Add billable commodity');

  if (isLoadingPaymentModes) {
    return (
      <Workspace2 title={title} hasUnsavedChanges={isDirty}>
        <InlineLoading
          status="active"
          iconDescription={t('loadingDescription', 'Loading')}
          description={t('loading', 'Loading data') + '...'}
        />
      </Workspace2>
    );
  }

  return (
    <Workspace2 title={title} hasUnsavedChanges={isDirty}>
      <Form
        aria-label={t('billableCommodityForm', 'Billable commodity form')}
        className={styles.form}
        id="billable-commodity-form"
        onSubmit={handleSubmit(onSubmit)}>
        <Stack className={styles.stack} gap={5}>
          <div className={styles.formGroup}>
            {itemToEdit ? (
              <Layer>
                <TextInput
                  id="commodityName"
                  type="text"
                  labelText={t('commodityName', 'Commodity name')}
                  value={itemToEdit?.item || '--'}
                  readOnly
                />
              </Layer>
            ) : (
              <div>
                <FormLabel className={styles.conceptLabel}>{t('searchForCommodity', 'Search for commodity')}</FormLabel>
                <Search
                  id="commoditiesSearch"
                  labelText={t('searchForCommodity', 'Search for commodity')}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  onClear={() => {
                    setSearchTerm('');
                    setSelectedItem(null);
                  }}
                  placeholder={t('searchCommodity', 'Search commodity')}
                  ref={searchInputRef}
                  value={selectedItem?.drugName || searchTerm}
                  size={isTablet ? 'sm' : 'lg'}
                />

                {(() => {
                  if (!debouncedSearchTerm || selectedItem) {
                    return null;
                  }
                  if (isLoading) {
                    return (
                      <InlineLoading className={styles.loader} description={t('searching', 'Searching') + '...'} />
                    );
                  }
                  if (searchResults && searchResults.length) {
                    return (
                      <ul className={styles.conceptsList}>
                        {searchResults?.map((searchResult) => (
                          <li
                            className={styles.service}
                            key={searchResult.uuid}
                            onClick={() => {
                              setSelectedItem(searchResult);
                              setSearchTerm('');
                            }}
                            role="menuitem">
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
                          {t('noResultsFor', 'No results for {{searchTerm}}', { searchTerm: debouncedSearchTerm })}
                        </span>
                      </Tile>
                    </Layer>
                  );
                })()}
              </div>
            )}
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
                          items={paymentModes ?? []}
                          itemToString={(item) => (item ? item.name : '')}
                          label={t('selectPaymentMode', 'Select payment mode')}
                          onChange={({ selectedItem }) => field.onChange(selectedItem.uuid)}
                          selectedItem={paymentModes.find((mode) => mode.uuid === field.value) ?? null}
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
              {!itemToEdit && (
                <Button
                  className={styles.paymentButtons}
                  iconDescription={t('add', 'Add')}
                  kind="tertiary"
                  onClick={handleAppendPaymentMode}
                  renderIcon={(props) => <Add size={24} {...props} />}
                  type="button">
                  {t('addPaymentOption', 'Add payment option')}
                </Button>
              )}
              {getPaymentErrorMessage() && <div className={styles.errorMessage}>{getPaymentErrorMessage()}</div>}
            </div>
          </section>
        </Stack>
        <ButtonSet className={isTablet ? styles.tablet : styles.desktop}>
          <Button className={styles.button} kind="secondary" disabled={isSubmitting} onClick={() => closeWorkspace()}>
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

export default BillableCommodityFormWorkspace;
