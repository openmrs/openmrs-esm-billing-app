import React, { useState, useRef } from 'react';
import {
  ButtonSet,
  Button,
  RadioButtonGroup,
  RadioButton,
  Search,
  Table,
  TableHead,
  TableBody,
  TableHeader,
  TableRow,
  TableCell,
} from '@carbon/react';
import styles from './billing-form.scss';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { useFetchSearchResults, processBillItems } from '../billing.resource';
import { mutate } from 'swr';
import { convertToCurrency } from '../helpers';

type BillingFormProps = {
  patientUuid: string;
  closeWorkspace: () => void;
};

const BillingForm: React.FC<BillingFormProps> = ({ patientUuid, closeWorkspace }) => {
  const { t } = useTranslation();

  const [grandTotal, setGrandTotal] = useState(0);
  const [searchOptions, setSearchOptions] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [category, setCategory] = useState('');

  const toggleSearch = (choiceSelected) => {
    (document.getElementById('searchField') as HTMLInputElement).disabled = false;
    setCategory(choiceSelected === 'Stock Item' ? 'Stock Item' : 'Service');
  };

  const calculateTotal = (event, itemName) => {
    const quantity = parseInt(event.target.value);
    const updatedItems = billItems.map((item) => {
      if (item.Item.toLowerCase().includes(itemName.toLowerCase())) {
        const price = item.Price;
        const total = price * quantity;
        return { ...item, Qnty: quantity, Total: total };
      }
      return item;
    });

    setBillItems(updatedItems);

    const updatedGrandTotal = updatedItems.reduce((acc, item) => acc + item.Total, 0);
    setGrandTotal(updatedGrandTotal);
  };

  const calculateTotalAfterAddBillItem = () => {
    const sum = billItems.reduce((acc, item) => acc + item.Price, 0);
    setGrandTotal(sum);
  };

  const addItemToBill = (event, itemid, itemname, itemcategory, itemPrice) => {
    const newItem = {
      uuid: itemid,
      Item: itemname,
      Qnty: 1,
      Price: itemPrice,
      Total: itemPrice,
      category: itemcategory,
    };

    setBillItems([...billItems, newItem]);
    setSearchOptions([]);
    calculateTotalAfterAddBillItem();
    (document.getElementById('searchField') as HTMLInputElement).value = '';
  };

  const { data, error, isLoading, isValidating } = useFetchSearchResults(searchVal, category);

  const filterItems = (val) => {
    setSearchVal(val);

    if (!isLoading && data) {
      const res = data as { results: any[] };

      const options = res.results.map((o) => {
        if (o.commonName && o.commonName !== '') {
          return {
            uuid: o.uuid || '',
            Item: o.commonName,
            Qnty: 1,
            Price: 10,
            Total: 10,
            category: 'StockItem',
          };
        } else if (o.name.toLowerCase().includes(val.toLowerCase())) {
          return {
            uuid: o.uuid || '',
            Item: o.name,
            Qnty: 1,
            Price: o.servicePrices[0].price,
            Total: o.servicePrices[0].price,
            category: 'Service',
          };
        }
      });

      setSearchOptions(options.filter((option) => option)); // Filter out undefined/null values
    }
  };

  const postBillItems = () => {
    const bill = {
      cashPoint: '54065383-b4d4-42d2-af4d-d250a1fd2590',
      cashier: 'f9badd80-ab76-11e2-9e96-0800200c9a66',
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
        priceUuid: '7b9171ac-d3c1-49b4-beff-c9902aee5245',
        lineItemOrder: 0,
        paymentStatus: 'PENDING',
      };

      if (item.category === 'StockItem') {
        lineItem.item = item.uuid;
      } else {
        lineItem.billableService = item.uuid;
      }

      bill.lineItems.push(lineItem);
    });

    const url = `/ws/rest/v1/cashier/bill`;
    processBillItems(bill).then(
      () => {
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
        showSnackbar({ title: 'Bill processing error', kind: 'error', subtitle: error });
      },
    );
  };

  return (
    <div className={styles.billingFormContainer}>
      <RadioButtonGroup
        legendText={t('selectCategory', 'Select category')}
        name="radio-button-group"
        defaultSelected="radio-1"
        className={styles.billingItem}
        onChange={toggleSearch}>
        <RadioButton labelText={t('stockItem', 'Stock Item')} value="Stock Item" id="radio-1" />
        <RadioButton labelText={t('service', 'Service')} value="Service" id="radio-2" />
      </RadioButtonGroup>

      <div>
        <Search
          id="searchField"
          size="lg"
          placeholder="Find your drugs here..."
          labelText="Search"
          disabled
          closeButtonLabelText="Clear search input"
          onChange={() => {}}
          className={styles.billingItem}
          onKeyUp={(e) => {
            filterItems(e.target.value);
          }}
        />

        <ul className={styles.searchContent}>
          {searchOptions.map((row) => (
            <li key={row.uuid} className={styles.searchItem}>
              <Button
                id={row.uuid}
                onClick={(e) => addItemToBill(e, row.uuid, row.Item, row.category, row.Price)}
                style={{ background: 'inherit', color: 'black' }}>
                {row.Item} Qnty.{row.Qnty} Ksh.{row.Price}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <Table aria-label="sample table" className={styles.billingItem}>
        <TableHead>
          <TableRow>
            <TableHeader>Item</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Price</TableHeader>
            <TableHeader>Total</TableHeader>
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
                    className="form-control"
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
              </TableRow>
            ))
          ) : (
            <p>Loading...</p>
          )}
          <TableRow>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell style={{ fontWeight: 'bold' }}>Grand Total:</TableCell>
            <TableCell id="GrandTotalSum">{convertToCurrency(grandTotal)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <ButtonSet className={styles.billingItem}>
        <Button kind="secondary" onClick={closeWorkspace}>
          Discard
        </Button>
        <Button kind="primary" onClick={postBillItems}>
          Save & Close
        </Button>
      </ButtonSet>
    </div>
  );
};

export default BillingForm;
