import React, { useState, useEffect, useRef } from 'react';
import isEmpty from 'lodash-es/isEmpty';
import {
  Button,
  ButtonSet,
  Form,
  InlineLoading,
  RadioButton,
  RadioButtonGroup,
  Search,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { mutate } from 'swr';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { showSnackbar, showToast, useConfig, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';
import { convertToCurrency } from '../helpers';
import { type BillableItem } from '../types';
import { useFetchSearchResults, processBillItems } from '../billing.resource';
import styles from './billing-form.scss';

type BillingFormProps = {
  patientUuid: string;
  closeWorkspace: () => void;
};

const BillingForm: React.FC<BillingFormProps> = ({ patientUuid, closeWorkspace }) => {
  const { t } = useTranslation();
  const { defaultCurrency, postBilledItems } = useConfig();
  const isTablet = useLayoutType() === 'tablet';

  const [grandTotal, setGrandTotal] = useState(0);
  const [searchOptions, setSearchOptions] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [category, setCategory] = useState('');
  const [saveDisabled, setSaveDisabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedItems, setAddedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const searchOptionsRef = useRef(null);

  const billItemSchema = z.object({
    Qnty: z.number().min(1, t('quantityGreaterThanZero', 'Quantity must be at least one for all items.')), // zod logic
  });

  const calculateTotal = (quantity, itemName) => {
    let isValid = true;

    try {
      billItemSchema.parse({ Qnty: quantity });
    } catch (error) {
      isValid = false;
    }

    const updatedItems = billItems.map((item) =>
      item.Item === itemName ? { ...item, Qnty: quantity, Total: quantity * item.Price } : item,
    );

    setBillItems(updatedItems);
    setSaveDisabled(!isValid || updatedItems.some((item) => item.Qnty <= 0));
    setGrandTotal(updatedItems.reduce((acc, item) => acc + item.Total, 0));
  };

  const addItemToBill = (event, itemid, itemname, itemcategory, itemPrice) => {
    const existingItemIndex = billItems.findIndex((item) => item.uuid === itemid);

    let updatedItems = [];
    if (existingItemIndex >= 0) {
      updatedItems = billItems.map((item, index) => {
        if (index === existingItemIndex) {
          const updatedQuantity = item.Qnty + 1;
          return { ...item, Qnty: updatedQuantity, Total: updatedQuantity * item.Price };
        }
        return item;
      });
    } else {
      const newItem = {
        uuid: itemid,
        Item: itemname,
        Qnty: 1,
        Price: itemPrice,
        Total: itemPrice,
        category: itemcategory,
      };
      updatedItems = [...billItems, newItem];
      setAddedItems([...addedItems, newItem]);
    }

    setBillItems(updatedItems);
    setGrandTotal(updatedItems.reduce((acc, item) => acc + item.Total, 0));
    (document.getElementById('searchField') as HTMLInputElement).value = '';
    setSearchTerm('');
    setSearchOptions([]);
  };

  const removeItemFromBill = (uuid) => {
    const updatedItems = billItems.filter((item) => item.uuid !== uuid);
    setBillItems(updatedItems);

    // Update the list of added items
    setAddedItems(addedItems.filter((item) => item.uuid !== uuid));

    const updatedGrandTotal = updatedItems.reduce((acc, item) => acc + item.Total, 0);
    setGrandTotal(updatedGrandTotal);
  };

  const { data, error, isLoading, isValidating } = useFetchSearchResults(debouncedSearchTerm, category);

  useEffect(() => {
    const res = data as { results: BillableItem[] };
    setSearchOptions(
      res?.results?.map((item) =>
        category === 'Commodity'
          ? {
              uuid: item?.uuid || '',
              Item: item?.drugName ? item?.drugName : item?.commonName,
              Qnty: 1,
              Price: item?.drugName ? item?.purchasePrice : 0,
              Total: item?.drugName ? item?.purchasePrice : 0,
              category: 'Commodity',
            }
          : {
              uuid: item?.uuid || '',
              Item: item?.name ? item?.name : '',
              Qnty: 1,
              Price: item?.servicePrices.length > 0 ? item?.servicePrices[0]?.price : 0,
              Total: item?.servicePrices.length > 0 ? item?.servicePrices[0]?.price : 0,
              category: 'Service',
            },
      ) || [],
    );
  }, [data, category]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchOptionsRef.current && !searchOptionsRef.current.contains(event.target)) {
        (document.getElementById('searchField') as HTMLInputElement).value = '';
        setSearchTerm('');
        setSearchOptions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    billItems.forEach((item) => {
      const lineItem: any = {
        quantity: parseInt(item.Qnty),
        price: item.Price,
        priceName: 'Default',
        priceUuid: postBilledItems.priceUuid,
        lineItemOrder: 0,
        paymentStatus: 'PENDING',
      };

      if (item.category === 'Commodity') {
        lineItem.item = item.uuid;
      } else {
        lineItem.billableService = item.uuid;
      }

      bill?.lineItems.push(lineItem);
    });

    const url = `${apiBasePath}bill`;
    processBillItems(bill).then(
      () => {
        setIsSubmitting(false);

        closeWorkspace();
        mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
        showSnackbar({
          title: t('billItems', 'Save Bill'),
          subtitle: 'Bill processing has been successful',
          kind: 'success',
          timeoutInMs: 3000,
        });
      },
      (error) => {
        setIsSubmitting(false);
        showSnackbar({ title: 'Bill processing error', kind: 'error', subtitle: error?.message });
      },
    );
  };

  return (
    <Form className={styles.form}>
      <div className={styles.grid}>
        <Stack>
          <Search
            id="searchField"
            size="lg"
            className={styles.mt2}
            // disabled={disableSearch}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchServices', 'Search for billable services')}
            labelText={t('searchServices', 'Search for billable services')}
          />
        </Stack>
        <Stack>
          <ul className={styles.searchContent} ref={searchOptionsRef}>
            {searchOptions?.length > 0 &&
              searchOptions?.map((row) => (
                <li key={row.uuid} className={styles.searchItem}>
                  <Button
                    id={row.uuid}
                    onClick={(e) => addItemToBill(e, row.uuid, row.Item, row.category, row.Price)}
                    style={{ background: 'inherit', color: 'black', 'max-width': '100%' }}>
                    {row.Item} Qnty.{row.Qnty} {defaultCurrency}.{row.Price}
                  </Button>
                </li>
              ))}

            {searchOptions?.length === 0 && !isLoading && !!debouncedSearchTerm && (
              <p>{t('noResultsFound', 'No results found')}</p>
            )}
          </ul>
        </Stack>
        <Stack>
          <Table aria-label="sample table" className={styles.mt2}>
            <TableHead>
              <TableRow>
                <TableHeader>Item</TableHeader>
                <TableHeader>Quantity</TableHeader>
                <TableHeader>Price</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {billItems && Array.isArray(billItems) ? (
                billItems.map((row) => (
                  <TableRow key={row.uuid}>
                    <TableCell>{row.Item}</TableCell>
                    <TableCell>
                      <TextInput
                        className={`${row.Qnty <= 0 ? styles.invalidInput : ''}`}
                        defaultWidth={10}
                        id={row.Item}
                        value={row.Qnty || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          calculateTotal(value, row.Item);
                        }}
                        size="sm"
                        type="number"
                      />
                    </TableCell>
                    <TableCell id={row.Item + 'Price'}>{row.Price}</TableCell>
                    <TableCell id={row.Item + 'Total'} className="totalValue">
                      {row?.Total?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <TrashCan onClick={() => removeItemFromBill(row.uuid)} className={styles.removeButton} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <p>Loading...</p>
              )}
              <TableRow>
                <TableCell colSpan={3}></TableCell>
                <TableCell style={{ fontWeight: 'bold' }}>{t('grandTotal', 'Grand total')}:</TableCell>
                <TableCell id="GrandTotalSum">{convertToCurrency(grandTotal, defaultCurrency)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Stack>

        <ButtonSet className={isTablet ? styles.tablet : styles.desktop}>
          <Button className={styles.button} kind="secondary" disabled={isSubmitting} onClick={closeWorkspace}>
            {t('discard', 'Discard')}
          </Button>
          <Button
            className={styles.button}
            kind="primary"
            onClick={postBillItems}
            disabled={isSubmitting || saveDisabled}
            type="submit">
            {isSubmitting ? (
              <InlineLoading description={t('saving', 'Saving') + '...'} />
            ) : (
              t('saveAndClose', 'Save and close')
            )}
          </Button>
        </ButtonSet>
      </div>
    </Form>
  );
};

export default BillingForm;
