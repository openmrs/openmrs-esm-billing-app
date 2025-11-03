import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import {
  Button,
  ButtonSet,
  ComboBox,
  IconButton,
  InlineLoading,
  InlineNotification,
  Form,
  NumberInput,
} from '@carbon/react';
import { useConfig, useLayoutType, showSnackbar, getCoreTranslation, TrashCanIcon } from '@openmrs/esm-framework';
import { processBillItems, useBillableServices } from '../billing.resource';
import { calculateTotalAmount, convertToCurrency } from '../helpers/functions';
import type { BillingConfig } from '../config-schema';
import type { BillableItem, LineItem, ServicePrice } from '../types';
import { apiBasePath } from '../constants';
import styles from './billing-form.scss';

interface ExtendedLineItem extends LineItem {
  selectedPaymentMethod?: ServicePrice;
  availablePaymentMethods?: ServicePrice[];
}

type BillingFormProps = {
  patientUuid: string;
  closeWorkspace: () => void;
};

const BillingForm: React.FC<BillingFormProps> = ({ patientUuid, closeWorkspace }) => {
  const isTablet = useLayoutType() === 'tablet';
  const { t } = useTranslation();
  const { defaultCurrency, postBilledItems } = useConfig<BillingConfig>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ExtendedLineItem[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean; itemName: string; itemUuid: string }>({
    show: false,
    itemName: '',
    itemUuid: '',
  });
  const { data, error, isLoading } = useBillableServices();

  const selectBillableItem = (item: BillableItem) => {
    if (!item) return;

    const existingItem = selectedItems.find((selectedItem) => selectedItem.uuid === item.uuid);
    if (existingItem) {
      // Show warning instead of silently adding
      setDuplicateWarning({
        show: true,
        itemName: item.name || item.commonName || 'This service',
        itemUuid: item.uuid,
      });
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

  const handleIncreaseQuantity = () => {
    if (duplicateWarning.itemUuid) {
      const existingItem = selectedItems.find((item) => item.uuid === duplicateWarning.itemUuid);
      if (existingItem) {
        const updatedItem = { ...existingItem, quantity: existingItem.quantity + 1 };
        setSelectedItems(
          [...selectedItems].map((selectedItem) =>
            selectedItem.uuid === duplicateWarning.itemUuid ? updatedItem : selectedItem,
          ),
        );
      }
    }
    setDuplicateWarning({ show: false, itemName: '', itemUuid: '' });
  };

  const handleDismissWarning = () => {
    setDuplicateWarning({ show: false, itemName: '', itemUuid: '' });
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
    const bill = {
      cashPoint: postBilledItems.cashPoint,
      cashier: postBilledItems.cashier,
      lineItems: [],
      payments: [],
      patient: patientUuid,
      status: 'PENDING',
    };

    selectedItems.forEach((item) => {
      const lineItem: LineItem = {
        quantity: item.quantity,
        price: item.price,
        lineItemOrder: 0,
        paymentStatus: 'PENDING',
        billableService: item.uuid,
      };

      bill.lineItems.push(lineItem);
    });

    const url = `${apiBasePath}bill`;
    try {
      await processBillItems(bill);
      closeWorkspace();
      mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
      showSnackbar({
        title: t('saveBill', 'Save bill'),
        subtitle: t('billProcessedSuccessfully', 'Bill processed successfully'),
        kind: 'success',
      });
    } catch (error) {
      showSnackbar({
        title: t('billProcessingError', 'Bill processing error'),
        kind: 'error',
        subtitle: error?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
            titleText={t('searchItems', 'Search items and services')}
          />
        )}
        {duplicateWarning.show && (
          <div className={styles.notificationContainer}>
            <InlineNotification
              kind="warning"
              lowContrast
              title={t('duplicateServiceWarning', 'Duplicate service detected')}
              subtitle={t(
                'duplicateServiceMessage',
                '{{itemName}} is already in this bill. Would you like to increase the quantity?',
                { itemName: duplicateWarning.itemName },
              )}
              onCloseButtonClick={handleDismissWarning}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginLeft: '3rem' }}>
              <Button kind="primary" size="sm" onClick={handleIncreaseQuantity}>
                {t('increaseQuantity', 'Yes, increase quantity')}
              </Button>
              <Button kind="secondary" size="sm" onClick={handleDismissWarning}>
                {t('cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        )}
        {selectedItems && selectedItems.length > 0 && (
          <div className={styles.selectedItemsContainer}>
            <h4>{t('selectedItems', 'Selected items')}</h4>
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
        <Button className={styles.button} kind="secondary" disabled={isSubmitting} onClick={closeWorkspace}>
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
  );
};

export default BillingForm;
