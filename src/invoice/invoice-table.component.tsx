import React, { useMemo, useState, useEffect } from 'react';
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
  type DataTableRow,
  TableToolbarSearch,
  TableSelectRow,
  Tile,
  Button,
} from '@carbon/react';
import { isDesktop, showModal, useConfig, useDebounce, useLayoutType } from '@openmrs/esm-framework';
import { type LineItem, type MappedBill } from '../types';
import styles from './invoice-table.scss';
import { convertToCurrency } from '../helpers';
import { Edit } from '@carbon/react/icons';

type InvoiceTableProps = {
  bill: MappedBill;
  isSelectable?: boolean;
  isLoadingBill?: boolean;
  onSelectItem?: (selectedLineItems: LineItem[]) => void;
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ bill, isSelectable = true, isLoadingBill, onSelectItem }) => {
  const { t } = useTranslation();
  const lineItems = bill?.lineItems ?? [];
  const paidLineItems = lineItems?.filter((item) => item.paymentStatus === 'PAID') ?? [];
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [selectedLineItems, setSelectedLineItems] = useState(paidLineItems ?? []);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const { defaultCurrency, showEditBillButton } = useConfig();

  useEffect(() => {
    if (onSelectItem) {
      onSelectItem(selectedLineItems);
    }
  }, [selectedLineItems, onSelectItem]);

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
    { header: 'No', key: 'no', width: 7 }, // Width as a percentage
    { header: 'Bill item', key: 'billItem', width: 25 },
    { header: 'Bill code', key: 'billCode', width: 20 },
    { header: 'Status', key: 'status', width: 25 },
    { header: 'Quantity', key: 'quantity', width: 15 },
    { header: 'Price', key: 'price', width: 24 },
    { header: 'Total', key: 'total', width: 15 },
    { header: t('actions', 'Actions'), key: 'actionButton' },
  ];

  const handleSelectBillItem = (row: LineItem) => {
    const dispose = showModal('edit-bill-line-item-dialog', {
      bill,
      item: row,
      closeModal: () => dispose(),
    });
  };

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
          total: item.price * item.quantity,
          actionButton: (
            <span>
              {showEditBillButton ? (
                <Button
                  data-testid={`edit-button-${item.uuid}`}
                  renderIcon={Edit}
                  hasIconOnly
                  kind="ghost"
                  iconDescription={t('editThisBillItem', 'Edit this bill item')}
                  tooltipPosition="left"
                  onClick={() => handleSelectBillItem(item)}
                />
              ) : (
                '--'
              )}
            </span>
          ),
        };
      }) ?? [],
    [bill?.receiptNumber, filteredLineItems, defaultCurrency, showEditBillButton, t],
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
            <TableToolbarSearch
              className={styles.searchbox}
              expanded
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              placeholder={t('searchThisTable', 'Search this table')}
              size={responsiveSize}
            />
            <Table
              {...getTableProps()}
              aria-label="Invoice line items"
              className={`${styles.invoiceTable} billingTable`}>
              <TableHead>
                <TableRow>
                  {rows.length > 1 && isSelectable ? <TableHeader /> : null}
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
                      {rows.length > 1 && isSelectable && (
                        <TableSelectRow
                          aria-label="Select row"
                          {...getSelectionProps({ row })}
                          disabled={tableRows[index].status === 'PAID'}
                          onChange={(checked: boolean) => handleRowSelection(row, checked)}
                          checked={
                            tableRows[index].status === 'PAID' ||
                            Boolean(selectedLineItems?.find((item) => item?.uuid === row?.id))
                          }
                        />
                      )}
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
