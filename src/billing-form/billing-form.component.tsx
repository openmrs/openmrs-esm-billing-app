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
import { showSnackbar } from '@openmrs/esm-framework';
import { useFetchSearchResults, processBillItems } from '../billing.resource'; // Corrected the import path
import { mutate } from 'swr';

type BillItem = {
  uuid: string;
  Item: string;
  Qnty: number;
  Price: number;
  Total: number;
  category: string;
};

type BillingFormProps = {
  patientUuid: string;
  closeWorkspace: () => void;
};

const BillingForm: React.FC<BillingFormProps> = ({ patientUuid, closeWorkspace }) => {
  const { t } = useTranslation();
  const [GrandTotal, setGrandTotal] = useState<number>(0);
  const [searchOptions, setSearchOptions] = useState<BillItem[]>([]);
  const [BillItems, setBillItems] = useState<BillItem[]>([]);
  const [searchVal, setSearchVal] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  const numberRef = useRef<HTMLInputElement>(null);

  const toggleSearch = (choiceSelected: string) => {
    setSearchVal('');
    setSearchOptions([]);
    setCategory(choiceSelected === 'Stock Item' ? 'Stock Item' : 'Service');
  };

  const calculateTotal = (event: React.ChangeEvent<HTMLInputElement>, itemName: string) => {
    const Qnty = parseInt(event.target.value);
    const price = BillItems.find((item) => item.Item.toLowerCase() === itemName.toLowerCase())?.Price || 0;
    const total = price * Qnty;

    const updatedBillItems = BillItems.map((item) =>
      item.Item.toLowerCase() === itemName.toLowerCase() ? { ...item, Qnty, Total: total } : item,
    );

    setBillItems(updatedBillItems);

    const grandTotal = updatedBillItems.reduce((acc, curr) => acc + curr.Total, 0);
    setGrandTotal(grandTotal);
  };

  const addItemToBill = (item: BillItem) => {
    const existingItemIndex = BillItems.findIndex((existingItem) => existingItem.Item === item.Item);

    if (existingItemIndex !== -1) {
      const updatedBillItems = [...BillItems];
      updatedBillItems[existingItemIndex].Qnty += 1;
      updatedBillItems[existingItemIndex].Total =
        updatedBillItems[existingItemIndex].Price * updatedBillItems[existingItemIndex].Qnty;
      setBillItems(updatedBillItems);
    } else {
      setBillItems((prevItems) => [...prevItems, { ...item, Qnty: 1, Total: item.Price }]);
    }

    setGrandTotal((prevTotal) => prevTotal + item.Price);
    setSearchVal('');
    setSearchOptions([]);
  };

  const postBillItems = () => {
    const bill = {
      cashPoint: '54065383-b4d4-42d2-af4d-d250a1fd2590',
      cashier: 'f9badd80-ab76-11e2-9e96-0800200c9a66',
      lineItems: BillItems.map((item) => ({
        [item.category === 'StockItem' ? 'item' : 'billableService']: item.uuid,
        quantity: item.Qnty,
        price: item.Price,
        priceName: 'Default',
        priceUuid: '7b9171ac-d3c1-49b4-beff-c9902aee5245',
        lineItemOrder: 0,
        paymentStatus: 'PENDING',
      })),
      payments: [],
      patient: patientUuid,
      status: 'PENDING',
    };

    processBillItems(bill).then(
      () => {
        closeWorkspace();
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
        onChange={({ value }) => toggleSearch(value)}>
        <RadioButton labelText={t('stockItem', 'Stock Item')} value="Stock Item" id="radio-1" />
        <RadioButton labelText={t('service', 'Service')} value="Service" id="radio-2" />
      </RadioButtonGroup>

      <Search
        id="searchField"
        size="lg"
        placeholder="Find your drugs here..."
        labelText="Search"
        disabled={!category}
        closeButtonLabelText="Clear search input"
        onChange={(e) => setSearchVal(e.target.value)}
        className={styles.billingItem}
      />

      <ul className={styles.searchContent}>
        {searchOptions.map((row) => (
          <li key={row.uuid} className={styles.searchItem}>
            <Button onClick={() => addItemToBill(row)} style={{ background: 'inherit', color: 'black' }}>
              {row.Item} Qnty.{row.Qnty} Ksh.{row.Price}
            </Button>
          </li>
        ))}
      </ul>

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
          {BillItems.map((row) => (
            <TableRow key={row.uuid}>
              <TableCell>{row.Item}</TableCell>
              <TableCell>
                <input
                  type="number"
                  className="form-control"
                  min={0}
                  max={100}
                  value={row.Qnty}
                  onChange={(e) => calculateTotal(e, row.Item)}
                />
              </TableCell>
              <TableCell>{row.Price}</TableCell>
              <TableCell className="totalValue">{row.Total}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell />
            <TableCell />
            <TableCell style={{ fontWeight: 'bold' }}>Grand Total:</TableCell>
            <TableCell id="GrandTotalSum">{GrandTotal}</TableCell>
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
