import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import fuzzy from 'fuzzy';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  IconButton,
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
  type DataTableRow,
} from '@carbon/react';

import {
  EditIcon,
  TrashCanIcon,
  isDesktop,
  showModal,
  useConfig,
  useDebounce,
  useLayoutType,
  getCoreTranslation,
} from '@openmrs/esm-framework';
import { type LineItem, type MappedBill } from '../types';
import { convertToCurrency } from '../helpers';
import type { BillingConfig } from '../config-schema';
import styles from './invoice-table.scss';

type InvoiceTableProps = {
  bill: MappedBill;
  isLoadingBill?: boolean;
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ bill, isLoadingBill }) => {
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

    return debouncedSearchTerm
      ? fuzzy
          .filter(debouncedSearchTerm, lineItems, {
            extract: (lineItem: LineItem) => `${lineItem.item}`,
          })
          .sort((r1, r2) => r1.score - r2.score)
          .map((result) => result.original)
      : lineItems;
  }, [debouncedSearchTerm, lineItems]);

  const tableHeaders = [
    { header: t('number', 'Number'), key: 'no', width: 7 }, // Width as a percentage
    { header: t('billItem', 'Bill item'), key: 'billItem', width: 25 },
    { header: t('billCode', 'Bill code'), key: 'billCode', width: 20 },
    { header: t('status', 'Status'), key: 'status', width: 25 },
    { header: t('quantity', 'Quantity'), key: 'quantity', width: 15 },
    { header: t('price', 'Price'), key: 'price', width: 24 },
    { header: t('total', 'Total'), key: 'total', width: 15 },
    { header: getCoreTranslation('actions'), key: 'actionButton' },
  ];

  const handleDeleteListItem = useCallback((row: LineItem) => {
    const dispose = showModal('ListItem-delete-confirmation-modal', {
      item: row,
      closeModal: () => dispose(),
    });
  }, []);

  const handleSelectBillItem = useCallback(
    (row: LineItem) => {
      const dispose = showModal('edit-bill-line-item-modal', {
        bill,
        item: row,
        closeModal: () => dispose(),
      });
    },
    [bill],
  );

  const tableRows: Array<typeof DataTableRow> = useMemo(
    () =>
      filteredLineItems?.map((item, index) => {
        return {
          no: `${index + 1}`,
          id: `${item.uuid}`,
          billItem: item.billableService ? item.billableService : item?.item,
          billCode: <span data-testid={`receipt-number-${index}`}>{bill?.receiptNumber}</span>,
          status: item.paymentStatus,
          quantity: item.quantity,
          price: convertToCurrency(item.price, defaultCurrency),
          total: convertToCurrency(item.price * item.quantity, defaultCurrency),
          actionButton: (
            <div className={styles.actionButtons}>
              <IconButton
                data-testid={`edit-button-${item.uuid}`}
                label={t('editThisBillItem', 'Edit this bill item')}
                kind="ghost"
                tooltipPosition="left"
                onClick={() => handleSelectBillItem(item)}>
                <EditIcon size={16} />
              </IconButton>

              <IconButton
                data-testid={`delete-button-${item.uuid}`}
                label={t('deleteitem', 'Delete item')}
                kind="ghost"
                align="top"
                onClick={() => handleDeleteListItem(item)}>
                <TrashCanIcon size={16} />
              </IconButton>
            </div>
          ),
        };
      }) ?? [],
    [filteredLineItems, bill?.receiptNumber, defaultCurrency, t, handleSelectBillItem, handleDeleteListItem],
  );

  if (isLoadingBill) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton
          data-testid="loader"
          columnCount={tableHeaders.length}
          showHeader={false}
          showToolbar={false}
          size={responsiveSize}
          zebra
        />
      </div>
    );
  }

  return (
    <div className={styles.lineItemsWrapper}>
      <DataTable headers={tableHeaders} rows={tableRows} size={responsiveSize} useZebraStyles>
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
              className={`${styles.invoiceTable} billingTable`}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader key={header.key}>{header.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => {
                  return (
                    <TableRow
                      key={row.id}
                      {...getRowProps({
                        row,
                      })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
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
