import React, { useState, useEffect, useMemo } from 'react';
import {
  ButtonSet,
  Button,
  Form,
  InlineLoading,
  RadioButtonGroup,
  RadioButton,
  Search,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableHeader,
  TableRow,
  TableCell,
} from '@carbon/react';
import styles from './billing-form.scss';
import { useTranslation } from 'react-i18next';
import { restBaseUrl, showSnackbar, showToast, useConfig, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import { useFetchSearchResults, processBillItems } from '../billing.resource';
import { mutate } from 'swr';
import { convertToCurrency } from '../helpers';
import { z } from 'zod';
import { TrashCan } from '@carbon/react/icons';
import fuzzy from 'fuzzy';
import { type BillabeItem } from '../types';
import { apiBasePath } from '../constants';
import isEmpty from 'lodash-es/isEmpty';

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
  const [searchVal, setSearchVal] = useState('');
  const [category, setCategory] = useState('');
  const [saveDisabled, setSaveDisabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedItems, setAddedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [disableSearch, setDisableSearch] = useState<boolean>(true);

  const toggleSearch = (choiceSelected) => {
    if (!isEmpty(choiceSelected)) {
      setDisableSearch(false);
    }
    setCategory(choiceSelected === 'Stock Item' ? 'Stock Item' : 'Service');
  };

  const billItemSchema = z.object({
    Qnty: z.number().min(1, t('quantityGreaterThanZero', 'Quantity must be at least one for all items.')), // zod logic
  });

  const calculateTotal = (event, itemName) => {
    const quantity = parseInt(event.target.value);
    let isValid = true;

    try {
      billItemSchema.parse({ Qnty: quantity });
    } catch (error) {
      isValid = false;
      const parsedErrorMessage = JSON.parse(error.message);
      showToast({
        title: t('billItems', 'Save Bill'),
        kind: 'error',
        description: parsedErrorMessage[0].message,
      });
    }

    const updatedItems = billItems.map((item) => {
      if (item.Item.toLowerCase().includes(itemName.toLowerCase())) {
        return { ...item, Qnty: quantity, Total: quantity > 0 ? item.Price * quantity : 0 };
      }
      return item;
    });

    const anyInvalidQuantity = updatedItems.some((item) => item.Qnty <= 0);

    setSaveDisabled(!isValid || anyInvalidQuantity);

    const updatedGrandTotal = updatedItems.reduce((acc, item) => acc + item.Total, 0);
    setGrandTotal(updatedGrandTotal);
  };

  const calculateTotalAfterAddBillItem = (items) => {
    const sum = items.reduce((acc, item) => acc + item.Price * item.Qnty, 0);
    setGrandTotal(sum);
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
    calculateTotalAfterAddBillItem(updatedItems);
    (document.getElementById('searchField') as HTMLInputElement).value = '';
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

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);

  const filterItems = useMemo(() => {
    if (!debouncedSearchTerm || isLoading || error) {
      return [];
    }

    const res = data as { results: BillabeItem[] };
    const existingItemUuids = new Set(billItems.map((item) => item.uuid));

    const preprocessedData = res?.results
      ?.map((item) => {
        return {
          uuid: item.uuid || '',
          Item: item.commonName ? item.commonName : item.name,
          Qnty: 1,
          Price: item.commonName ? 10 : item.servicePrices[0]?.price,
          Total: item.commonName ? 10 : item.servicePrices[0]?.price,
          category: item.commonName ? 'StockItem' : 'Service',
        };
      })
      .filter((item) => !existingItemUuids.has(item.uuid));

    return debouncedSearchTerm
      ? fuzzy
          .filter(debouncedSearchTerm, preprocessedData, {
            extract: (o) => `${o.Item}`,
          })
          .sort((r1, r2) => r1.score - r2.score)
          .map((result) => result.original)
      : searchOptions;
  }, [debouncedSearchTerm, data, billItems]);

  useEffect(() => {
    setSearchOptions(filterItems);
  }, [filterItems]);

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
      let lineItem: any = {
        quantity: parseInt(item.Qnty),
        price: item.Price,
        priceName: 'Default',
        priceUuid: postBilledItems.priceUuid,
        lineItemOrder: 0,
        paymentStatus: 'PENDING',
      };

      if (item.category === 'StockItem') {
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

  const handleClearSearchTerm = () => {
    setSearchOptions([]);
  };

  return (
    <Form className={styles.form}>
      <div className={styles.grid}>
        <Stack>
          <RadioButtonGroup
            legendText={t('selectCategory', 'Select category')}
            name="radio-button-group"
            defaultSelected="radio-1"
            className={styles.mt2}
            onChange={toggleSearch}>
            <RadioButton labelText={t('stockItem', 'Stock Item')} value="Stock Item" id="stockItem" />
            <RadioButton labelText={t('service', 'Service')} value="Service" id="service" />
          </RadioButtonGroup>
        </Stack>
        <Stack>
          <Search
            size="lg"
            id="searchField"
            disabled={disableSearch}
            closeButtonLabelText={t('clearSearchInput', 'Clear search input')}
            className={styles.mt2}
            placeholder={t('searchItems', 'Search items and services')}
            labelText={t('searchItems', 'Search items and services')}
            onKeyUp={handleSearchTermChange}
            onClear={handleClearSearchTerm}
          />
        </Stack>
        <Stack>
          <ul className={styles.searchContent}>
            {searchOptions?.length > 0 &&
              searchOptions?.map((row) => (
                <li key={row.uuid} className={styles.searchItem}>
                  <Button
                    id={row.uuid}
                    onClick={(e) => addItemToBill(e, row.uuid, row.Item, row.category, row.Price)}
                    style={{ background: 'inherit', color: 'black' }}>
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
                  <TableRow>
                    <TableCell>{row.Item}</TableCell>
                    <TableCell>
                      <input
                        type="number"
                        className={`form-control ${row.Qnty <= 0 ? styles.invalidInput : ''}`}
                        id={row.Item}
                        min={0}
                        max={100}
                        value={row.Qnty}
                        onChange={(e) => {
                          calculateTotal(e, row.Item);
                          row.Qnty = e.target.value;
                        }}
                      />
                    </TableCell>
                    <TableCell id={row.Item + 'Price'}>{row.Price}</TableCell>
                    <TableCell id={row.Item + 'Total'} className="totalValue">
                      {row.Total}
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
