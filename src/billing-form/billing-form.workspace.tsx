import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  ComboBox,
  Form,
  IconButton,
  InlineLoading,
  InlineNotification,
  NumberInput,
} from '@carbon/react';
import {
  useConfig,
  useLayoutType,
  showSnackbar,
  getCoreTranslation,
  TrashCanIcon,
  type Workspace2DefinitionProps,
  Workspace2,
} from '@openmrs/esm-framework';
import { processBillItems, updateBillItems, useBill, useBillableServices } from '../billing.resource';
import { useBillableServices as useBillableServicesList } from '../billable-services/billable-service.resource';
import { getBillableServiceUuid } from '../invoice/payments/utils';
import { calculateTotalAmount, convertToCurrency } from '../helpers/functions';
import type { BillingConfig } from '../config-schema';
import type { BillableItem, LineItem, ServicePrice } from '../types';
import styles from './billing-form.scss';

interface ExtendedLineItem extends LineItem {
  selectedPaymentMethod?: ServicePrice;
  availablePaymentMethods?: ServicePrice[];
}

type BillingFormProps = {
  patientUuid: string;
  closeWorkspace: () => void;
  onMutate?: () => void;
  billUuid?: string;
};

const BillingForm: React.FC<Workspace2DefinitionProps<BillingFormProps>> = ({
  workspaceProps: { patientUuid, onMutate, billUuid },
  closeWorkspace,
}) => {
  const isTablet = useLayoutType() === 'tablet';
  const { t } = useTranslation();
  const { defaultCurrency, postBilledItems } = useConfig<BillingConfig>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ExtendedLineItem[]>([]);
  const { data, error, isLoading } = useBillableServices();
  const { bill, isLoading: isLoadingBill, error: billError } = useBill(billUuid);
  const {
    billableServices,
    isLoading: isLoadingBillableServices,
    error: billableServicesError,
  } = useBillableServicesList();
  const isEditMode = !!billUuid && !!bill;
  const existingItemsTotal = useMemo(
    () => (isEditMode ? calculateTotalAmount(bill.lineItems) : 0),
    [isEditMode, bill?.lineItems],
  );

  const availableBillableItems = useMemo(() => {
    if (!data) return [];
    if (!isEditMode) return data;
    const lineItems = bill.lineItems ?? [];
    const existingNames = new Set(
      lineItems.flatMap((lineItem) => [lineItem.billableService, lineItem.item].filter(Boolean)),
    );
    return data.filter((item) => item.name && !existingNames.has(item.name));
  }, [data, isEditMode, bill?.lineItems]);

  const selectBillableItem = (item: BillableItem) => {
    if (!item) {
      return;
    }

    const existingItem = selectedItems.find((selectedItem) => selectedItem.uuid === item.uuid);
    if (existingItem) {
      const updatedItem = { ...existingItem, quantity: existingItem.quantity + 1 };
      setSelectedItems(
        [...selectedItems].map((selectedItem) => (selectedItem.uuid === item.uuid ? updatedItem : selectedItem)),
      );
      return;
    }

    const availablePaymentMethods = item.servicePrices || [];
    let defaultPrice = 0;
    let selectedPaymentMethod = null;

    if (availablePaymentMethods.length === 1) {
      const price = availablePaymentMethods[0].price;
      defaultPrice = typeof price === 'number' ? price : parseFloat(price);
      selectedPaymentMethod = availablePaymentMethods[0];
    }

    const mappedItem: ExtendedLineItem = {
      uuid: item.uuid,
      display: item.name,
      quantity: 1,
      price: defaultPrice,
      billableService: item.uuid,
      paymentStatus: 'PENDING',
      lineItemOrder: 0,
      selectedPaymentMethod: selectedPaymentMethod,
      availablePaymentMethods: availablePaymentMethods,
    };

    setSelectedItems([...selectedItems, mappedItem]);
  };

  const updateQuantity = (uuid: string, quantity: number) => {
    const updatedItems = [...selectedItems].map((item) => (item.uuid === uuid ? { ...item, quantity } : item));
    setSelectedItems(updatedItems);
  };

  const removeSelectedBillableItem = (uuid: string) => {
    const updatedItems = [...selectedItems].filter((item) => item.uuid !== uuid);
    setSelectedItems(updatedItems);
  };

  const updatePaymentMethod = (itemUuid: string, paymentMethod: ServicePrice) => {
    const updatedItems = [...selectedItems].map((item) =>
      item.uuid === itemUuid
        ? {
            ...item,
            selectedPaymentMethod: paymentMethod,
            price: typeof paymentMethod.price === 'number' ? paymentMethod.price : parseFloat(paymentMethod.price),
            priceName: paymentMethod.name,
            priceUuid: paymentMethod.uuid,
          }
        : item,
    );
    setSelectedItems(updatedItems);
  };

  const validateSelectedItems = (): boolean => {
    if (selectedItems.length === 0) {
      return false;
    }
    for (const item of selectedItems) {
      if (item.availablePaymentMethods && item.availablePaymentMethods.length > 1 && !item.selectedPaymentMethod) {
        showSnackbar({
          title: t('validationError', 'Validation error'),
          subtitle: t('paymentMethodRequired', 'Payment method is required for all items'),
          kind: 'error',
        });
        return false;
      }
      if (!item.quantity || item.quantity < 1) {
        return false;
      }
    }
    return true;
  };

  const postBillItems = async () => {
    if (isSubmitting || selectedItems.length === 0) {
      return;
    }
    if (isEditMode && (isLoadingBillableServices || billableServicesError)) {
      return;
    }
    if (!validateSelectedItems()) {
      return;
    }

    setIsSubmitting(true);

    const newLineItems: Array<LineItem> = selectedItems.map((item) => ({
      quantity: item.quantity,
      price: item.price,
      lineItemOrder: 0,
      paymentStatus: 'PENDING',
      billableService: item.uuid,
    }));

    try {
      if (isEditMode) {
        const existingLineItems = bill.lineItems.map((item) => {
          const serviceUuid = getBillableServiceUuid(billableServices, item.billableService || item.item);
          if (!serviceUuid) {
            throw new Error(
              t('serviceResolutionError', 'Could not resolve service "{{service}}"', {
                service: item.billableService || item.item,
              }),
            );
          }
          return {
            uuid: item.uuid,
            quantity: item.quantity,
            price: item.price,
            lineItemOrder: item.lineItemOrder,
            paymentStatus: item.paymentStatus,
            billableService: serviceUuid,
            priceName: item.priceName,
            priceUuid: item.priceUuid,
          };
        });

        const payload = {
          cashPoint: bill.cashPointUuid,
          cashier: bill.cashier.uuid,
          lineItems: [...existingLineItems, ...newLineItems],
          patient: bill.patientUuid,
          status: bill.status,
          uuid: bill.uuid,
        };

        await updateBillItems(payload);
      } else {
        const payload = {
          cashPoint: postBilledItems.cashPoint,
          cashier: postBilledItems.cashier,
          lineItems: newLineItems,
          payments: [],
          patient: patientUuid,
          status: 'PENDING',
        };

        await processBillItems(payload);
      }

      closeWorkspace({ discardUnsavedChanges: true });
      onMutate?.();

      showSnackbar({
        title: isEditMode ? t('itemsAddedToBill', 'Items added to bill') : t('billProcessed', 'Bill processed'),
        subtitle: isEditMode
          ? t('itemsAddedToBillSuccessfully', 'Items have been added to the bill successfully')
          : t('billProcessedSuccessfully', 'Bill processed successfully'),
        kind: 'success',
      });
    } catch (err) {
      showSnackbar({
        title: t('billProcessingError', 'Bill processing error'),
        kind: 'error',
        subtitle: err instanceof Error ? err.message : t('unknownBillError', 'An unexpected error occurred'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    postBillItems();
  };

  return (
    <Workspace2
      title={isEditMode ? t('addItemsToBill', 'Add items to bill') : t('addBillItems', 'Add bill items')}
      hasUnsavedChanges={selectedItems.length > 0}>
      <Form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.grid}>
          {billUuid && isLoadingBill ? (
            <InlineLoading description={getCoreTranslation('loading') + '...'} />
          ) : billUuid && billError ? (
            <InlineNotification
              kind="error"
              lowContrast
              title={t('errorLoadingBill', 'Error loading bill')}
              subtitle={billError?.message}
            />
          ) : isEditMode && billableServicesError ? (
            <InlineNotification
              kind="error"
              lowContrast
              title={t('errorLoadingBillableServices', 'Error loading billable services')}
              subtitle={billableServicesError?.message}
            />
          ) : (
            <>
              {isEditMode && (
                <div className={styles.existingItemsContainer}>
                  <h4 className={styles.sectionHeading}>{t('existingItems', 'Existing items')}</h4>
                  {bill.lineItems.map((item) => (
                    <div key={item.uuid} className={styles.existingItemRow}>
                      <span className={styles.existingItemName}>
                        {item.billableService || item.item || item.display}
                      </span>
                      <span className={styles.existingItemDetail}>
                        {item.quantity} x {convertToCurrency(item.price, defaultCurrency)}
                      </span>
                      <span className={styles.existingItemTotal}>
                        {convertToCurrency(item.price * item.quantity, defaultCurrency)}
                      </span>
                    </div>
                  ))}
                  <div className={styles.existingItemsSubtotal}>
                    <strong>
                      {t('subtotal', 'Subtotal')}: {convertToCurrency(existingItemsTotal, defaultCurrency)}
                    </strong>
                  </div>
                </div>
              )}
              {isEditMode && <h4 className={styles.sectionHeading}>{t('newItems', 'New items')}</h4>}
              {isLoading ? (
                <InlineLoading description={getCoreTranslation('loading') + '...'} />
              ) : error ? (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title={t('errorLoadingBillableServices', 'Error loading billable services')}
                  subtitle={error?.message}
                />
              ) : (
                <ComboBox
                  id="searchItems"
                  onChange={({ selectedItem: item }: { selectedItem: BillableItem }) => selectBillableItem(item)}
                  itemToString={(item: BillableItem) => item?.name || ''}
                  items={availableBillableItems}
                  titleText={t('searchItems', 'Search items and services')}
                />
              )}
            </>
          )}
          {selectedItems && selectedItems.length > 0 && (
            <div className={styles.selectedItemsContainer}>
              <h4 className={styles.sectionHeading}>{t('selectedItems', 'Selected items')}</h4>
              {selectedItems.map((item) => (
                <div key={item.uuid} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemName}>{item.display}</span>
                    <IconButton
                      align="top-end"
                      kind="ghost"
                      label={t('remove', 'Remove')}
                      onClick={() => removeSelectedBillableItem(item.uuid)}>
                      <TrashCanIcon size={16} />
                    </IconButton>
                  </div>

                  <div className={styles.itemControls}>
                    {item.availablePaymentMethods && item.availablePaymentMethods.length > 1 ? (
                      <div className={styles.controlSection}>
                        <label>{t('selectPaymentMethod', 'Select payment method')}</label>
                        <ComboBox
                          id={`payment-method-${item.uuid}`}
                          items={item.availablePaymentMethods}
                          itemToString={(method: ServicePrice) =>
                            method
                              ? `${method.name} - ${convertToCurrency(
                                  typeof method.price === 'number' ? method.price : parseFloat(method.price),
                                  defaultCurrency,
                                )}`
                              : ''
                          }
                          selectedItem={item.selectedPaymentMethod}
                          onChange={({ selectedItem }) => {
                            if (selectedItem) {
                              updatePaymentMethod(item.uuid, selectedItem);
                            }
                          }}
                          placeholder={t('selectPaymentMethod', 'Select payment method')}
                          titleText=""
                        />
                      </div>
                    ) : (
                      <div className={styles.controlSection}>
                        <label>{t('unitPrice', 'Unit price')}</label>
                        <span className={styles.priceDisplay}>{convertToCurrency(item.price, defaultCurrency)}</span>
                      </div>
                    )}

                    <div className={styles.controlSection}>
                      <label>{t('quantity', 'Quantity')}</label>
                      <NumberInput
                        allowEmpty
                        disableWheel
                        hideSteppers
                        id={`quantity-${item.uuid}`}
                        invalid={!item.quantity || item.quantity < 1}
                        invalidText={t('quantityMustBeAtLeastOne', 'Quantity must be at least 1')}
                        onChange={(_, { value }) => {
                          const number = parseFloat(String(value));
                          updateQuantity(item.uuid, isNaN(number) ? 0 : number);
                        }}
                        value={item.quantity}
                      />
                    </div>

                    <div className={styles.controlSection}>
                      <label>{t('total', 'Total')}</label>
                      <span className={styles.totalDisplay}>
                        {convertToCurrency(item.price * item.quantity, defaultCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div className={styles.grandTotal}>
                <strong>
                  {t('grandTotal', 'Grand total')}:{' '}
                  {convertToCurrency(existingItemsTotal + calculateTotalAmount(selectedItems), defaultCurrency)}
                </strong>
              </div>
            </div>
          )}
        </div>

        <ButtonSet className={isTablet ? styles.tablet : styles.desktop}>
          <Button
            className={styles.button}
            kind="secondary"
            disabled={isSubmitting}
            onClick={() => closeWorkspace({ discardUnsavedChanges: false })}>
            {t('discard', 'Discard')}
          </Button>
          <Button
            className={styles.button}
            kind="primary"
            disabled={isSubmitting || selectedItems.length === 0 || (isEditMode && isLoadingBillableServices)}
            type="submit">
            {isSubmitting ? (
              <InlineLoading description={t('saving', 'Saving') + '...'} />
            ) : (
              t('saveAndClose', 'Save and close')
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default BillingForm;
