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
} from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { useConfig, useLayoutType, showSnackbar } from '@openmrs/esm-framework';
import { processBillItems, useBillableServices } from '../billing.resource';
import { calculateTotalAmount, convertToCurrency } from '../helpers/functions';
import type { BillingConfig } from '../config-schema';
import type { BillableItem, LineItem } from '../types';
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

    const mappedItem: LineItem = {
      uuid: item.uuid,
      display: item.name,
      quantity: 1,
      price: item.servicePrices?.length > 0 ? parseFloat(item.servicePrices?.[0]?.price) : 0,
      billableService: item.uuid,
      paymentStatus: 'PENDING',
      lineItemOrder: 0,
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

  const postBillItems = () => {
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
          <Table aria-label="sample table" className={styles.mt2}>
            <TableHead>
              <TableRow>
                <TableHeader>{t('item', 'Item')}</TableHeader>
                <TableHeader>{t('quantity', 'Quantity')}</TableHeader>
                <TableHeader>{t('price', 'Price')}</TableHeader>
                <TableHeader>{t('total', 'Total')}</TableHeader>
                <TableHeader>{t('action', 'Action')}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedItems.map((row) => (
                <TableRow>
                  <TableCell>{row.display}</TableCell>
                  <TableCell>
                    <NumberInput
                      id={row.uuid}
                      min={1}
                      value={row.quantity}
                      onChange={(_, { value }) => {
                        const number = parseFloat(String(value));
                        updateQuantity(row.uuid, isNaN(number) ? 1 : number);
                      }}
                    />
                  </TableCell>
                  <TableCell id={row.uuid + 'Price'}>{row.price}</TableCell>
                  <TableCell id={row.uuid + 'Total'} className="totalValue">
                    {row.price * row.quantity}
                  </TableCell>
                  <TableCell>
                    <TrashCan className={styles.removeButton} onClick={() => removeSelectedBillableItem(row.uuid)} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3}></TableCell>
                <TableCell style={{ fontWeight: 'bold' }}>{t('grandTotal', 'Grand total')}:</TableCell>
                <TableCell id="GrandTotalSum">
                  {convertToCurrency(calculateTotalAmount(selectedItems), defaultCurrency)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>

      <ButtonSet className={isTablet ? styles.tablet : styles.desktop}>
        <Button className={styles.button} kind="secondary" disabled={isSubmitting || selectedItems.length === 0} onClick={closeWorkspace}>
          {t('discard', 'Discard')}
        </Button>
        <Button className={styles.button} kind="primary" onClick={postBillItems} disabled={isSubmitting} type="submit">
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
