import React, { useMemo, useState } from 'react';
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
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TableSelectRow,
  Tile,
  type DataTableHeader,
  type DataTableRow,
} from '@carbon/react';
import { isDesktop, useConfig, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import { type LineItem, type MappedBill } from '../types';
import styles from './invoice-table.scss';
import { convertToCurrency } from '../helpers';

type InvoiceTableProps = {
  bill: MappedBill;
  isSelectable?: boolean;
  isLoadingBill?: boolean;
  onSelectItem?: (selectedLineItems: LineItem[]) => void;
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ bill, isSelectable = true, isLoadingBill, onSelectItem }) => {
  const { t } = useTranslation();
  const lineItems = bill?.lineItems ?? [];
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const { defaultCurrency } = useConfig();

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

  const tableHeaders: Array<typeof DataTableHeader> = [
    { header: 'No', key: 'no' },
    { header: 'Bill item', key: 'billItem' },
    { header: 'Bill code', key: 'billCode' },
    { header: 'Status', key: 'status' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Price', key: 'price' },
    { header: 'Total', key: 'total' },
  ];

  const tableRows: Array<typeof DataTableRow> = useMemo(
    () =>
      filteredLineItems?.map((item, index) => {
        return {
          no: `${index + 1}`,
          id: `${item.uuid}`,
          billItem: item.item || item.billableService,
          billCode: bill?.receiptNumber,
          status: bill?.status,
          quantity: item.quantity,
          price: convertToCurrency(item.price, defaultCurrency),
          total: convertToCurrency(item.price * item.quantity, defaultCurrency),
        };
      }) ?? [],
    [bill?.receiptNumber, bill?.status, filteredLineItems],
  );

  if (isLoadingBill) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton
          columnCount={tableHeaders.length}
          showHeader={false}
          showToolbar={false}
          size={responsiveSize}
          zebra
        />
      </div>
    );
  }

  const handleRowSelection = (row: typeof DataTableRow, checked: boolean) => {
    const matchingRow = filteredLineItems.find((item) => item.uuid === row.id);
    let newSelectedLineItems;

    if (checked) {
      newSelectedLineItems = [...selectedLineItems, matchingRow];
    } else {
      newSelectedLineItems = selectedLineItems.filter((item) => item.uuid !== row.id);
    }
    setSelectedLineItems(newSelectedLineItems);
    onSelectItem(newSelectedLineItems);
  };

  return (
    <div className={styles.invoiceContainer}>
      <DataTable headers={tableHeaders} isSortable rows={tableRows} size={responsiveSize} useZebraStyles>
        {({ rows, headers, getRowProps, getSelectionProps, getTableProps, getToolbarProps }) => (
          <TableContainer
            description={
              <span className={styles.tableDescription}>
                <span>{t('itemsToBeBilled', 'Items to be billed')}</span>
              </span>
            }
            title={t('lineItems', 'Line items')}>
            <div className={styles.toolbarWrapper}>
              <TableToolbar {...getToolbarProps()} className={styles.tableToolbar} size={responsiveSize}>
                <TableToolbarContent className={styles.headerContainer}>
                  <TableToolbarSearch
                    className={styles.searchbox}
                    expanded
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    placeholder={t('searchThisTable', 'Search this table')}
                    size={responsiveSize}
                  />
                </TableToolbarContent>
              </TableToolbar>
            </div>
            <Table {...getTableProps()} aria-label="Invoice line items" className={styles.table}>
              <TableHead>
                <TableRow>
                  {rows.length > 1 && isSelectable ? <TableHeader /> : null}
                  {headers.map((header) => (
                    <TableHeader key={header.key}>{header.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    {...getRowProps({
                      row,
                    })}>
                    {rows.length > 1 && isSelectable && (
                      <TableSelectRow
                        aria-label="Select row"
                        {...getSelectionProps({ row })}
                        onChange={(checked: boolean) => handleRowSelection(row, checked)}
                      />
                    )}
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
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
