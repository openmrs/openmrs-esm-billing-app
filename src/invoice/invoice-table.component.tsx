import React, { useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import fuzzy from 'fuzzy';
import {
  DataTable,
  DataTableSkeleton,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbarSearch,
  Tile,
} from '@carbon/react';
import { getCoreTranslation, isDesktop, useConfig, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import { type LineItem, type MappedBill } from '../types';
import { convertToCurrency } from '../helpers';
import type { BillingConfig } from '../config-schema';
import LineItemActionMenu from './line-item-action-menu.component';
import styles from './invoice-table.scss';

type InvoiceTableProps = {
  bill: MappedBill;
  isLoadingBill?: boolean;
  onMutate?: () => void;
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ bill, isLoadingBill, onMutate }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const layout = useLayoutType();
  const lineItems = useMemo(() => bill?.lineItems ?? [], [bill?.lineItems]);
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);

  const filteredLineItems = useMemo(() => {
    if (!debouncedSearchTerm) {
      return lineItems;
    }

    return fuzzy
      .filter(debouncedSearchTerm, lineItems, {
        extract: (lineItem: LineItem) => `${lineItem.billableService} ${lineItem.item}`,
      })
      .sort((r1, r2) => r1.score - r2.score)
      .map((result) => result.original);
  }, [debouncedSearchTerm, lineItems]);

  const lineItemsByUuid = useMemo(() => new Map(lineItems.map((item) => [item.uuid, item])), [lineItems]);

  const tableHeaders = [
    { header: t('number', 'Number'), key: 'no', width: 7 }, // Width as a percentage
    { header: t('billItem', 'Bill item'), key: 'billItem', width: 25 },
    { header: t('status', 'Status'), key: 'status', width: 25 },
    { header: t('quantity', 'Quantity'), key: 'quantity', width: 15 },
    { header: t('price', 'Price'), key: 'price', width: 24 },
    { header: t('total', 'Total'), key: 'total', width: 15 },
  ];

  const tableRows = useMemo(
    () =>
      filteredLineItems?.map((item, index) => ({
        no: `${index + 1}`,
        id: `${item.uuid}`,
        billItem: item.billableService ? item.billableService : item?.item,
        status: item.paymentStatus,
        quantity: item.quantity,
        price: convertToCurrency(item.price, defaultCurrency),
        total: convertToCurrency(item.price * item.quantity, defaultCurrency),
      })) ?? [],
    [filteredLineItems, defaultCurrency],
  );

  if (isLoadingBill) {
    return (
      <DataTableSkeleton
        data-testid="loader"
        columnCount={tableHeaders.length}
        showHeader={false}
        showToolbar={false}
        zebra
      />
    );
  }

  return (
    <div className={styles.lineItemsWrapper}>
      <DataTable
        headers={tableHeaders}
        rows={tableRows}
        size={responsiveSize}
        useZebraStyles
        overflowMenuOnHover={isDesktop(layout)}>
        {({ rows, headers, getRowProps, getTableProps }) => (
          <TableContainer
            description={
              <span className={styles.tableDescription}>
                <span>{t('itemsToBeBilled', 'Items to be billed')}</span>
              </span>
            }
            title={t('lineItems', 'Line items')}>
            <TableToolbarSearch
              className={styles.searchbox}
              expanded
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              placeholder={t('searchThisTable', 'Search this table')}
              size={responsiveSize}
            />
            <Table
              {...getTableProps()}
              aria-label={t('invoiceLineItems', 'Invoice line items')}
              className={classNames(styles.invoiceTable, 'billingTable')}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader key={header.key}>{header.header}</TableHeader>
                  ))}
                  <TableHeader aria-label={getCoreTranslation('actions')} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const item = lineItemsByUuid.get(row.id);
                  return (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                      <TableCell className="cds--table-column-menu">
                        {item && <LineItemActionMenu bill={bill} item={item} onMutate={onMutate} />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      {filteredLineItems?.length === 0 && (
        <div className={styles.filterEmptyState}>
          <Layer>
            <Tile className={styles.filterEmptyStateTile}>
              <p className={styles.filterEmptyStateContent}>
                {t('noMatchingItemsToDisplay', 'No matching items to display')}
              </p>
              <p className={styles.filterEmptyStateHelper}>{t('checkFilters', 'Check the filters above')}</p>
            </Tile>
          </Layer>
        </div>
      )}
    </div>
  );
};

export default InvoiceTable;
