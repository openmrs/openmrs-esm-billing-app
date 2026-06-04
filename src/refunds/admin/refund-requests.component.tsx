import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import {
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  Layer,
  Link,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import {
  EmptyCardIllustration,
  ErrorState,
  formatDate,
  isDesktop,
  parseDate,
  showModal,
  useConfig,
  useLayoutType,
  usePagination,
  usePaginationInfo,
  type LayoutType,
} from '@openmrs/esm-framework';
import { convertToCurrency } from '../../helpers';
import { useRefundRequests } from '../refunds.resource';
import type { BillingConfig } from '../../config-schema';
import { RefundStatus, type PatientInvoice } from '../../types';
import styles from './refund-requests.scss';

type FilterValue = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'ALL';

interface RefundStatusFilterItem {
  id: FilterValue;
  text: string;
}

const filterToStatuses = (value: FilterValue): RefundStatus[] => {
  if (value === 'ALL') {
    return [RefundStatus.REQUESTED, RefundStatus.APPROVED, RefundStatus.REJECTED, RefundStatus.COMPLETED];
  }
  return [value];
};

const RefundRequests: React.FC = () => {
  const { t } = useTranslation();
  const { defaultCurrency, pageSize: configuredPageSize } = useConfig<BillingConfig>();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';

  const filterItems: RefundStatusFilterItem[] = useMemo(
    () => [
      { id: 'REQUESTED', text: t('requested', 'Requested') },
      { id: 'APPROVED', text: t('approved', 'Approved') },
      { id: 'REJECTED', text: t('rejected', 'Rejected') },
      { id: 'COMPLETED', text: t('completed', 'Completed') },
      { id: 'ALL', text: t('all', 'All') },
    ],
    [t],
  );
  const [filter, setFilter] = useState<RefundStatusFilterItem>(filterItems[0]);
  const [currentPageSize, setCurrentPageSize] = useState(configuredPageSize ?? 10);
  const [searchString, setSearchString] = useState('');

  const { bills, isLoading, error, mutate, isValidating } = useRefundRequests({
    statuses: filterToStatuses(filter.id),
  });

  const filteredBills = useMemo(() => {
    const q = searchString.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(
      (b) => b.patient?.display?.toLowerCase().includes(q) || b.receiptNumber?.toLowerCase().includes(q),
    );
  }, [bills, searchString]);

  const { paginated, goTo, results: paginatedBills, currentPage } = usePagination(filteredBills, currentPageSize);
  const { pageSizes } = usePaginationInfo(currentPageSize, filteredBills.length, currentPage, paginatedBills.length);

  const headers = useMemo(
    () => [
      { key: 'dateCreated', header: t('date', 'Date') },
      { key: 'receiptNumber', header: t('invoiceNo', 'Invoice #') },
      { key: 'patient', header: t('patient', 'Patient') },
      { key: 'billAmount', header: t('billAmount', 'Bill amount') },
      { key: 'cashier', header: t('cashier', 'Cashier') },
    ],
    [t],
  );

  const handleRowClick = useCallback(
    (bill: PatientInvoice) => {
      const dispose = showModal('review-bill-refunds-modal', {
        bill,
        onMutate: mutate,
        closeModal: () => dispose(),
      });
    },
    [mutate],
  );

  const rows = useMemo(
    () =>
      paginatedBills.map((bill: PatientInvoice) => ({
        id: bill.uuid,
        dateCreated: bill.dateCreated ? formatDate(parseDate(bill.dateCreated), { mode: 'wide' }) : '--',
        patient: bill.patient?.display ?? '--',
        receiptNumber: bill.receiptNumber ? (
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRowClick(bill);
            }}>
            {bill.receiptNumber}
          </Link>
        ) : (
          '--'
        ),
        billAmount: convertToCurrency(bill.total ?? 0, defaultCurrency),
        cashier: bill.cashier?.display ?? '--',
        _raw: bill,
      })),
    [paginatedBills, defaultCurrency, handleRowClick],
  );

  const handleSearch = useCallback(
    (e) => {
      setSearchString(e.target.value);
      goTo(1);
    },
    [goTo],
  );

  const handleTableRowClick = useCallback(
    (rowId: string) => {
      const match = rows.find((r) => r.id === rowId);
      if (match) handleRowClick(match._raw);
    },
    [rows, handleRowClick],
  );

  let tableContent: React.ReactNode;
  if (isLoading && !bills?.length) {
    tableContent = (
      <div className={styles.loaderContainer} aria-busy="true" aria-label={t('loading', 'Loading')}>
        <DataTableSkeleton
          rowCount={currentPageSize}
          showHeader={false}
          showToolbar={false}
          zebra
          columnCount={headers.length}
        />
      </div>
    );
  } else if (error) {
    tableContent = (
      <div className={styles.errorContainer}>
        <Layer>
          <ErrorState error={error} headerTitle={t('refundRequests', 'Refund requests')} />
        </Layer>
      </div>
    );
  } else if (rows.length > 0) {
    tableContent = (
      <>
        <DataTable isSortable rows={rows} headers={headers} size={responsiveSize} useZebraStyles={rows.length > 1}>
          {({ rows: dataRows, headers: dataHeaders, getRowProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()} aria-label={t('refundRequests', 'Refund requests')}>
                <TableHead>
                  <TableRow>
                    {dataHeaders.map((header) => (
                      <TableHeader key={header.key}>{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataRows.map((row) => (
                    <TableRow
                      key={row.id}
                      {...getRowProps({ row })}
                      className={styles.row}
                      onClick={() => handleTableRowClick(row.id)}>
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
        {paginated && (
          <Pagination
            forwardText={t('nextPage', 'Next page')}
            backwardText={t('previousPage', 'Previous page')}
            page={currentPage}
            pageSize={currentPageSize}
            pageSizes={pageSizes}
            totalItems={filteredBills.length}
            size={responsiveSize}
            onChange={({ pageSize: newPageSize, page: newPage }) => {
              if (newPageSize !== currentPageSize) {
                setCurrentPageSize(newPageSize);
              }
              if (newPage !== currentPage) {
                goTo(newPage);
              }
            }}
          />
        )}
      </>
    );
  } else {
    tableContent = (
      <Layer className={styles.emptyStateContainer}>
        <Tile className={styles.tile}>
          <div className={styles.illo}>
            <EmptyCardIllustration />
          </div>
          <p className={styles.content}>{t('noRefundRequestsToDisplay', 'There are no refund requests to display.')}</p>
        </Tile>
      </Layer>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.servicesTableContainer}>
        <div className={styles.filterContainer}>
          <Dropdown
            className={styles.filterDropdown}
            direction="bottom"
            id="refund-status-filter"
            selectedItem={filter}
            items={filterItems}
            itemToString={(item: RefundStatusFilterItem) => (item ? item.text : '')}
            label=""
            onChange={({ selectedItem }: { selectedItem: RefundStatusFilterItem }) => {
              setFilter(selectedItem);
              goTo(1);
            }}
            size={responsiveSize}
            titleText={t('filterBy', 'Filter by:')}
            type="inline"
          />
        </div>

        <div className={styles.billListContainer}>
          <FilterableTableHeader
            handleSearch={handleSearch}
            isValidating={isValidating}
            layout={layout}
            responsiveSize={responsiveSize}
            searchString={searchString}
            t={t}
          />
          {tableContent}
        </div>
      </div>
    </main>
  );
};

interface FilterableTableHeaderProps {
  readonly layout: LayoutType;
  readonly handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly isValidating: boolean;
  readonly responsiveSize: 'sm' | 'md' | 'lg';
  readonly searchString: string;
  readonly t: (key: string, fallback: string) => string;
}

function FilterableTableHeader({
  layout,
  handleSearch,
  isValidating,
  responsiveSize,
  searchString,
  t,
}: FilterableTableHeaderProps) {
  return (
    <>
      <div className={styles.headerContainer}>
        <div
          className={classNames({
            [styles.tabletHeading]: !isDesktop(layout),
            [styles.desktopHeading]: isDesktop(layout),
          })}>
          <h4>{t('refundRequests', 'Refund requests')}</h4>
        </div>
        {isValidating && (
          <span>
            <InlineLoading />
          </span>
        )}
      </div>
      <Search
        closeButtonLabelText={t('clearSearch', 'Clear')}
        data-testid="refundRequestsSearchBar"
        labelText={t('searchRefundRequests', 'Search refund requests')}
        placeholder={t('searchByPatientOrBill', 'Search by patient name or bill #')}
        value={searchString}
        onChange={handleSearch}
        size={responsiveSize}
      />
    </>
  );
}

export default RefundRequests;
