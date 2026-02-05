import React, { useState, useEffect, useRef } from 'react';
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
import { processBillItems, updateBillItems, useBillableServices } from '../billing.resource';
import { calculateTotalAmount, convertToCurrency } from '../helpers/functions';
import type { BillingConfig } from '../config-schema';
import type { BillableItem, LineItem, ServicePrice, MappedBill } from '../types';
import styles from './billing-form.scss';

interface ExtendedLineItem extends LineItem {
  selectedPaymentMethod?: ServicePrice;
  availablePaymentMethods?: ServicePrice[];
}

type BillingFormProps = {
  patientUuid: string;
  closeWorkspace: () => void;
  onMutate?: () => void;
  billToEdit?: MappedBill;
};

const BillingForm: React.FC<Workspace2DefinitionProps<BillingFormProps>> = ({
  workspaceProps: { patientUuid, onMutate, billToEdit },
  closeWorkspace,
}) => {
  const isTablet = useLayoutType() === 'tablet';
  const { t } = useTranslation();
  const { defaultCurrency, postBilledItems } = useConfig<BillingConfig>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ExtendedLineItem[]>([]);
  const [lineItemUuidMap, setLineItemUuidMap] = useState<Map<string, string>>(new Map());
  const [selectedBillableItem, setSelectedBillableItem] = useState<BillableItem | null>(null);
  const { data, error, isLoading } = useBillableServices();
  const hasInitialized = useRef<string | undefined>(undefined);

  // Initialize selectedItems when editing a bill (only once per bill)
  useEffect(() => {
    const billUuid = billToEdit?.uuid;
    if (billToEdit && data && !isLoading && hasInitialized.current !== billUuid) {
      const uuidMap = new Map<string, string>();
      const convertedItems: ExtendedLineItem[] = billToEdit.lineItems.map((lineItem) => {
        // Preserve the original line item UUID
        const originalLineItemUuid = lineItem.uuid;

        // Find the matching billable service by UUID or name
        const billableService = data.find(
          (service) => service.uuid === lineItem.billableService || service.name === lineItem.billableService,
        );

        if (!billableService) {
          // If service not found, create a basic item
          const serviceKey = lineItem.billableService || '';
          if (originalLineItemUuid) {
            uuidMap.set(serviceKey, originalLineItemUuid);
          }
          return {
            ...lineItem,
            display: lineItem.item || lineItem.billableService || '',
            availablePaymentMethods: [],
            selectedPaymentMethod: undefined,
            uuid: serviceKey,
          };
        }

        const availablePaymentMethods = billableService.servicePrices || [];
        let selectedPaymentMethod: ServicePrice | undefined = undefined;

        // Match existing payment method by priceUuid first
        if (lineItem.priceUuid && availablePaymentMethods.length > 0) {
          selectedPaymentMethod = availablePaymentMethods.find((price) => price.uuid === lineItem.priceUuid);
        }

        // If not found by UUID, try matching by priceName
        if (!selectedPaymentMethod && lineItem.priceName && availablePaymentMethods.length > 0) {
          selectedPaymentMethod = availablePaymentMethods.find((price) => price.name === lineItem.priceName);
        }

        // If still not found, try matching by price value (as a fallback)
        if (!selectedPaymentMethod && lineItem.price && availablePaymentMethods.length > 0) {
          const itemPrice = typeof lineItem.price === 'number' ? lineItem.price : parseFloat(String(lineItem.price));
          selectedPaymentMethod = availablePaymentMethods.find((price) => {
            const priceValue = typeof price.price === 'number' ? price.price : parseFloat(String(price.price));
            return Math.abs(priceValue - itemPrice) < 0.01; // Allow small floating point differences
          });
        }

        // If still not found and only one payment method exists, use it
        if (!selectedPaymentMethod && availablePaymentMethods.length === 1) {
          selectedPaymentMethod = availablePaymentMethods[0];
        }

        // Determine the price to use - prefer original price, but use payment method price if original is 0
        let itemPrice = lineItem.price || 0;
        if (selectedPaymentMethod && itemPrice === 0) {
          const paymentMethodPrice =
            typeof selectedPaymentMethod.price === 'number'
              ? selectedPaymentMethod.price
              : parseFloat(selectedPaymentMethod.price);
          if (paymentMethodPrice > 0) {
            itemPrice = paymentMethodPrice;
          }
        }

        // Store mapping of billable service UUID to original line item UUID
        if (originalLineItemUuid) {
          uuidMap.set(billableService.uuid, originalLineItemUuid);
        }

        return {
          ...lineItem,
          // Use billable service UUID for matching in the form
          uuid: billableService.uuid,
          display: billableService.name || lineItem.item || lineItem.billableService || '',
          billableService: billableService.uuid,
          availablePaymentMethods,
          selectedPaymentMethod,
          price: itemPrice,
          quantity: lineItem.quantity || 1,
          paymentStatus: lineItem.paymentStatus || 'PENDING',
          lineItemOrder: lineItem.lineItemOrder || 0,
        };
      });

      setLineItemUuidMap(uuidMap);
      setSelectedItems(convertedItems);
      hasInitialized.current = billUuid;
    } else if (!billToEdit) {
      // Clear the map when not editing
      setLineItemUuidMap(new Map());
      hasInitialized.current = undefined;
    }
  }, [billToEdit, data, isLoading]);

  const selectBillableItem = (item: BillableItem | null) => {
    if (!item) {
      return;
    }

    const existingItem = selectedItems.find((selectedItem) => selectedItem.uuid === item.uuid);
    if (existingItem) {
      const updatedItem = { ...existingItem, quantity: existingItem.quantity + 1 };
      setSelectedItems(
        [...selectedItems].map((selectedItem) => (selectedItem.uuid === item.uuid ? updatedItem : selectedItem)),
      );
      // Clear the ComboBox selection after updating
      setTimeout(() => setSelectedBillableItem(null), 0);
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
    // Clear the ComboBox selection after adding
    setTimeout(() => setSelectedBillableItem(null), 0);
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
    for (const item of selectedItems) {
      if (item.availablePaymentMethods && item.availablePaymentMethods.length > 1 && !item.selectedPaymentMethod) {
        showSnackbar({
          title: t('validationError', 'Validation error'),
          subtitle: t('paymentMethodRequired', 'Payment method is required for all items'),
          kind: 'error',
        });
        return false;
      }
    }
    return true;
  };

  const postBillItems = async () => {
    if (!validateSelectedItems()) {
      return;
    }

    setIsSubmitting(true);

    const lineItems: LineItem[] = selectedItems.map((item) => {
      const lineItem: LineItem = {
        quantity: item.quantity,
        price: item.price,
        lineItemOrder: item.lineItemOrder || 0,
        paymentStatus: item.paymentStatus || 'PENDING',
        billableService: item.uuid,
      };

      // Include priceUuid and priceName if payment method is selected
      if (item.selectedPaymentMethod) {
        lineItem.priceUuid = item.selectedPaymentMethod.uuid;
        lineItem.priceName = item.selectedPaymentMethod.name;
      }

      // Preserve existing UUID if editing
      if (billToEdit) {
        const originalLineItemUuid = lineItemUuidMap.get(item.uuid);
        if (originalLineItemUuid) {
          lineItem.uuid = originalLineItemUuid;
          // Also preserve resourceVersion if available
          const originalItem = billToEdit.lineItems.find((li) => li.uuid === originalLineItemUuid);
          if (originalItem?.resourceVersion) {
            lineItem.resourceVersion = originalItem.resourceVersion;
          }
        }
      }

      return lineItem;
    });

    try {
      if (billToEdit) {
        // Update existing bill
        const updatePayload = {
          uuid: billToEdit.uuid,
          cashPoint: billToEdit.cashPointUuid,
          cashier: billToEdit.cashier.uuid,
          lineItems,
          patient: patientUuid,
          status: billToEdit.status,
        };

        await updateBillItems(updatePayload);
        closeWorkspace({ discardUnsavedChanges: true });

        // Call the mutate function from parent to revalidate bill list
        onMutate?.();

        showSnackbar({
          title: t('billUpdated', 'Bill updated'),
          subtitle: t('billUpdatedSuccessfully', 'Bill updated successfully'),
          kind: 'success',
        });
      } else {
        // Create new bill
        const createPayload = {
          cashPoint: postBilledItems.cashPoint,
          cashier: postBilledItems.cashier,
          lineItems,
          payments: [],
          patient: patientUuid,
          status: 'PENDING',
        };

        await processBillItems(createPayload);
        closeWorkspace({ discardUnsavedChanges: true });

        // Call the mutate function from parent to revalidate bill list
        onMutate?.();

        showSnackbar({
          title: t('billProcessed', 'Bill processed'),
          subtitle: t('billProcessedSuccessfully', 'Bill processed successfully'),
          kind: 'success',
        });
      }
    } catch (error) {
      showSnackbar({
        title: billToEdit
          ? t('billUpdateError', 'Bill update error')
          : t('billProcessingError', 'Bill processing error'),
        kind: 'error',
        subtitle: error?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Workspace2 title={billToEdit ? t('editBillItems', 'Edit bill items') : t('createBill', 'Create bill')}>
      <Form className={styles.form}>
        <div className={styles.grid}>
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
              items={data ?? []}
              selectedItem={selectedBillableItem}
              titleText={t('searchItems', 'Search items and services')}
            />
          )}

          {selectedItems && selectedItems.length > 0 && (
            <div className={styles.selectedItemsContainer}>
              <h4>{t('selectedItems', 'Selected items')}</h4>
              {selectedItems.map((item, index) => (
                <div key={`${item.uuid}-${index}`} className={styles.itemCard}>
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
                        min={1}
                        onChange={(_, { value }) => {
                          const number = parseFloat(String(value));
                          updateQuantity(item.uuid, isNaN(number) ? 1 : number);
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
                  {convertToCurrency(calculateTotalAmount(selectedItems), defaultCurrency)}
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
            onClick={postBillItems}
            disabled={isSubmitting || selectedItems.length === 0}
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
