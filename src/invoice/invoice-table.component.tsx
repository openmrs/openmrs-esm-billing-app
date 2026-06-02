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
import {
  getCoreTranslation,
  isDesktop,
  showModal,
  useConfig,
  useDebounce,
  useLayoutType,
} from '@openmrs/esm-framework';
import LineItemActionMenu from './line-item-action-menu.component';
import { convertToCurrency } from '../helpers';
import type { BillingConfig } from '../config-schema';
import { BillStatus, RefundStatus, type LineItem, type MappedBill } from '../types';
import styles from './invoice-table.scss';

const getLineItemTotal = (item: LineItem) => (item.price ?? 0) * (item.quantity ?? 0);

type InvoiceTableProps = {
  bill: MappedBill;
  isLoadingBill?: boolean;
  onMutate?: () => void;
  viewOnly?: boolean;
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ bill, isLoadingBill, onMutate, viewOnly }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const layout = useLayoutType();
  const lineItems = useMemo(() => bill?.lineItems ?? [], [bill?.lineItems]);
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);

  const discounts = useMemo(() => (bill?.discounts ?? []).filter((d) => !d.voided), [bill?.discounts]);
  const billStatusEligible = bill?.status === BillStatus.PENDING || bill?.status === BillStatus.POSTED;
  const hasBillLevelDiscount = discounts.some((d) => !d.lineItemUuid);

  const billRefunds = useMemo(() => (bill?.refunds ?? []).filter((r) => !r.voided), [bill?.refunds]);
  const billStatusRefundEligible =
    bill?.status === BillStatus.PAID ||
    bill?.status === BillStatus.PARTIALLY_REFUNDED ||
    bill?.status === BillStatus.REFUND_REQUESTED;
  const activeRefunds = billRefunds.filter(
    (r) => r.status === RefundStatus.REQUESTED || r.status === RefundStatus.APPROVED,
  );
  const activeBillLevelRefund = activeRefunds.some((r) => !r.lineItemUuid);

  const lineHasActiveRefund = (lineItemUuid: string) => activeRefunds.some((r) => r.lineItemUuid === lineItemUuid);

  const showLineItemRefundRequest = (lineItem: LineItem) =>
    billStatusRefundEligible && !activeBillLevelRefund && !lineHasActiveRefund(lineItem.uuid ?? '') && !!lineItem.uuid;

  const lineHasActiveDiscount = (lineItemUuid: string) => discounts.some((d) => d.lineItemUuid === lineItemUuid);

  const showLineItemRequest = (lineItem: LineItem) =>
    billStatusEligible && !hasBillLevelDiscount && !lineHasActiveDiscount(lineItem.uuid);

  const handleLineItemRefundRequest = (item: LineItem) => {
    if (!item.uuid) return;
    const lineTotal = getLineItemTotal(item);
    const lineCommittedRefunds = billRefunds.filter(
      (r) =>
        r.lineItemUuid === item.uuid && (r.status === RefundStatus.APPROVED || r.status === RefundStatus.COMPLETED),
    );
    const remaining = lineTotal - lineCommittedRefunds.reduce((s, r) => s + r.refundAmount, 0);
    const dispose = showModal('request-refund-modal', {
      bill: {
        uuid: bill.uuid,
        total: bill.totalAmount ?? 0,
        amountAfterDiscount: bill.netAmount ?? bill.totalAmount ?? 0,
      },
      lineItem: {
        uuid: item.uuid,
        display: item.item || item.billableService || '--',
        total: lineTotal,
        quantity: item.quantity,
        price: item.price,
      },
      remainingRefundable: Math.max(0, remaining),
      onMutate: () => onMutate?.(),
      closeModal: () => dispose(),
    });
  };

  const handleLineItemRequest = (lineItem: LineItem) => {
    const dispose = showModal('request-discount-modal', {
      bill: {
        uuid: bill.uuid,
        total: bill.totalAmount ?? 0,
        amountDue: Math.max(0, (bill.netAmount ?? bill.totalAmount ?? 0) - (bill.tenderedAmount ?? 0)),
        receiptNumber: bill.receiptNumber,
        lineItemCount: lineItems.length,
      },
      lineItem: {
        uuid: lineItem.uuid,
        display: lineItem.item || lineItem.billableService || '--',
        total: getLineItemTotal(lineItem),
        quantity: lineItem.quantity,
        price: lineItem.price,
      },
      onMutate: () => onMutate?.(),
      closeModal: () => dispose(),
    });
  };

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
        status: item.status,
        quantity: item.quantity,
        price: convertToCurrency(item.price, defaultCurrency),
        total: convertToCurrency(getLineItemTotal(item), defaultCurrency),
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
            {!viewOnly && (
              <TableToolbarSearch
                className={styles.searchbox}
                expanded
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                placeholder={t('searchThisTable', 'Search this table')}
                size={responsiveSize}
              />
            )}
            <Table
              {...getTableProps()}
              aria-label={t('invoiceLineItems', 'Invoice line items')}
              className={classNames(styles.invoiceTable, 'billingTable')}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader key={header.key}>{header.header}</TableHeader>
                  ))}
                  {!viewOnly && <TableHeader aria-label={getCoreTranslation('actions')} />}
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
                      {!viewOnly && (
                        <TableCell className="cds--table-column-menu">
                          {item && (
                            <LineItemActionMenu
                              bill={bill}
                              item={item}
                              onMutate={onMutate}
                              showDiscountRequest={showLineItemRequest(item)}
                              onDiscountRequest={() => handleLineItemRequest(item)}
                              showRefundRequest={showLineItemRefundRequest(item)}
                              onRefundRequest={() => handleLineItemRefundRequest(item)}
                            />
                          )}
                        </TableCell>
                      )}
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
              {!viewOnly && (
                <p className={styles.filterEmptyStateHelper}>{t('checkFilters', 'Check the filters above')}</p>
              )}
            </Tile>
          </Layer>
        </div>
      )}
    </div>
  );
};

export default InvoiceTable;
