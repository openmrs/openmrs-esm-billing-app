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
import { useDiscountRequests } from '../discounts.resource';
import type { BillingConfig } from '../../config-schema';
import { BillDiscountStatus, type PatientInvoice } from '../../types';
import styles from './discount-requests.scss';

type FilterValue = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

interface DiscountStatusFilterItem {
  id: FilterValue;
  text: string;
}

const filterToStatuses = (value: FilterValue): BillDiscountStatus[] => {
  if (value === 'ALL') {
    return [BillDiscountStatus.PENDING, BillDiscountStatus.APPROVED, BillDiscountStatus.REJECTED];
  }
  return [value as BillDiscountStatus];
};

const DiscountRequests: React.FC = () => {
  const { t } = useTranslation();
  const { defaultCurrency, pageSize: configuredPageSize } = useConfig<BillingConfig>();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';

  const filterItems: DiscountStatusFilterItem[] = useMemo(
    () => [
      { id: 'PENDING', text: t('pending', 'Pending') },
      { id: 'APPROVED', text: t('approved', 'Approved') },
      { id: 'REJECTED', text: t('rejected', 'Rejected') },
      { id: 'ALL', text: t('all', 'All') },
    ],
    [t],
  );
  const [filter, setFilter] = useState<DiscountStatusFilterItem>(filterItems[0]);
  const [currentPageSize, setCurrentPageSize] = useState(configuredPageSize ?? 10);
  const [searchString, setSearchString] = useState('');

  const { bills, isLoading, error, mutate, isValidating } = useDiscountRequests({
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
      const dispose = showModal('review-bill-discounts-modal', {
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

  return (
    <main className={styles.container}>
      <main className={styles.servicesTableContainer}>
        <div className={styles.filterContainer}>
          <Dropdown
            className={styles.filterDropdown}
            direction="bottom"
            id="discount-status-filter"
            selectedItem={filter}
            items={filterItems}
            itemToString={(item: DiscountStatusFilterItem) => (item ? item.text : '')}
            label=""
            onChange={({ selectedItem }: { selectedItem: DiscountStatusFilterItem }) => {
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
          {isLoading && !bills?.length ? (
            <div className={styles.loaderContainer} role="progressbar" aria-label={t('loadingDescription', 'Loading')}>
              <DataTableSkeleton
                rowCount={currentPageSize}
                showHeader={false}
                showToolbar={false}
                zebra
                columnCount={headers.length}
              />
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <Layer>
                <ErrorState error={error} headerTitle={t('discountRequests', 'Discount requests')} />
              </Layer>
            </div>
          ) : rows.length > 0 ? (
            <>
              <DataTable
                isSortable
                rows={rows}
                headers={headers}
                size={responsiveSize}
                useZebraStyles={rows.length > 1}>
                {({ rows: dataRows, headers: dataHeaders, getRowProps, getTableProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()} aria-label={t('discountRequests', 'Discount requests')}>
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
                            onClick={() => {
                              const match = rows.find((r) => r.id === row.id);
                              if (match) handleRowClick(match._raw);
                            }}>
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
          ) : (
            <Layer className={styles.emptyStateContainer}>
              <Tile className={styles.tile}>
                <div className={styles.illo}>
                  <EmptyCardIllustration />
                </div>
                <p className={styles.content}>
                  {t('noDiscountRequestsToDisplay', 'There are no discount requests to display.')}
                </p>
              </Tile>
            </Layer>
          )}
        </div>
      </main>
    </main>
  );
};

interface FilterableTableHeaderProps {
  layout: LayoutType;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isValidating: boolean;
  responsiveSize: 'sm' | 'md' | 'lg';
  searchString: string;
  t: (key: string, fallback: string) => string;
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
          <h4>{t('discountRequests', 'Discount requests')}</h4>
        </div>
        {isValidating && (
          <div className={styles.backgroundDataFetchingIndicator}>
            <span>
              <InlineLoading />
            </span>
          </div>
        )}
      </div>
      <Search
        closeButtonLabelText={t('clearSearch', 'Clear')}
        data-testid="discountRequestsSearchBar"
        labelText={t('searchDiscountRequests', 'Search discount requests')}
        placeholder={t('searchByPatientOrBill', 'Search by patient name or bill #')}
        value={searchString}
        onChange={handleSearch}
        size={responsiveSize}
      />
    </>
  );
}

export default DiscountRequests;
