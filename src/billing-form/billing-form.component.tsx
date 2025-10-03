import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import {
  Button,
  ButtonSet,
  ComboBox,
  Form,
  NumberInput,
  InlineLoading,
  InlineNotification,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Grid,
  Column,
} from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { useConfig, useLayoutType, showSnackbar } from '@openmrs/esm-framework';
import { processBillItems, useBillableServices } from '../billing.resource';
import { calculateTotalAmount, convertToCurrency } from '../helpers/functions';
import type { BillingConfig } from '../config-schema';
import type { BillableItem, LineItem, ServicePrice } from '../types';
import { apiBasePath } from '../constants';
import styles from './billing-form.scss';

type BillingFormProps = {
  patientUuid: string;
  closeWorkspace: () => void;
};

const BillingForm: React.FC<BillingFormProps> = ({ patientUuid, closeWorkspace }) => {
  const isTablet = useLayoutType() === 'tablet';
  const { t } = useTranslation();
  const { defaultCurrency, postBilledItems } = useConfig<BillingConfig>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<LineItem[]>([]);
  const { data, error, isLoading } = useBillableServices();

  const selectBillableItem = (item: BillableItem) => {
    if (!item) return;

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
      defaultPrice = parseFloat(availablePaymentMethods[0].price);
      selectedPaymentMethod = availablePaymentMethods[0];
    }

    const mappedItem: LineItem = {
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
            price: parseFloat(paymentMethod.price),
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
          title: t('validationError', 'Validation Error'),
          subtitle: t('selectPaymentMethodRequired', 'Please select a payment method for all items'),
          kind: 'error',
        });
        return false;
      }
    }
    return true;
  };

  const postBillItems = () => {
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
    processBillItems(bill).then(
      () => {
        setIsSubmitting(false);

        closeWorkspace();
        mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
        showSnackbar({
          title: t('saveBill', 'Save Bill'),
          subtitle: t('billProcessingSuccess', 'Bill processing has been successful'),
          kind: 'success',
          timeoutInMs: 3000,
        });
      },
      (error) => {
        setIsSubmitting(false);
        showSnackbar({
          title: t('billProcessingError', 'Bill processing error'),
          kind: 'error',
          subtitle: error?.message,
        });
      },
    );
  };

  return (
    <Form className={styles.form}>
      <div className={styles.grid}>
        {isLoading ? (
          <InlineLoading description={t('loading', 'Loading') + '...'} />
        ) : error ? (
          <InlineNotification
            kind="error"
            lowContrast
            title={t('billErrorService', 'Bill service error')}
            subtitle={t('errorLoadingBillServices', 'Error loading bill services')}
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
        {selectedItems && selectedItems.length > 0 && (
          <div className={styles.selectedItemsContainer}>
            <h4>{t('selectedItems', 'Selected Items')}</h4>
            {selectedItems.map((item) => (
              <div key={item.uuid} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemName}>{item.display}</span>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={TrashCan}
                    iconDescription={t('remove', 'Remove')}
                    onClick={() => removeSelectedBillableItem(item.uuid)}
                  />
                </div>

                <Grid className={styles.itemControls}>
                  <Column sm={4} md={2} lg={3}>
                    <div className={styles.controlSection}>
                      <label>{t('quantity', 'Quantity')}</label>
                      <NumberInput
                        id={`quantity-${item.uuid}`}
                        min={1}
                        value={item.quantity}
                        onChange={(_, { value }) => {
                          const number = parseFloat(String(value));
                          updateQuantity(item.uuid, isNaN(number) ? 1 : number);
                        }}
                      />
                    </div>
                  </Column>

                  <Column sm={4} md={4} lg={5}>
                    {item.availablePaymentMethods && item.availablePaymentMethods.length > 1 ? (
                      <div className={styles.controlSection}>
                        <label>{t('selectPaymentMethod', 'Select payment method')}</label>
                        <ComboBox
                          id={`payment-method-${item.uuid}`}
                          items={item.availablePaymentMethods}
                          itemToString={(method: ServicePrice) =>
                            method
                              ? `${method.name} - ${convertToCurrency(parseFloat(method.price), defaultCurrency)}`
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
                        <label>{t('unitPrice', 'Unit Price')}</label>
                        <span className={styles.priceDisplay}>{convertToCurrency(item.price, defaultCurrency)}</span>
                      </div>
                    )}
                  </Column>

                  <Column sm={4} md={2} lg={3}>
                    <div className={styles.controlSection}>
                      <label>{t('total', 'Total')}</label>
                      <span className={styles.totalDisplay}>
                        {convertToCurrency(item.price * item.quantity, defaultCurrency)}
                      </span>
                    </div>
                  </Column>
                </Grid>
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
