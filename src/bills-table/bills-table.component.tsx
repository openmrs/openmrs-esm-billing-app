import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import {
  DataTable,
  DataTableSkeleton,
  Dropdown,
  Layer,
  InlineLoading,
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
  useLayoutType,
  isDesktop,
  ErrorState,
  ConfigurableLink,
  useConfig,
  useDebounce,
  type LayoutType,
} from '@openmrs/esm-framework';
import { EmptyDataIllustration } from '@openmrs/esm-patient-common-lib';
import { usePaginatedBills } from '../billing.resource';
import type { MappedBill } from '../types';
import type { BillingConfig } from '../config-schema';
import styles from './bills-table.scss';

interface BillDisplayItem extends Omit<MappedBill, 'id'> {
  id: string;
  patientNameDisplay: React.ReactNode;
  billedItems: string;
}

interface BillPaymentStatusFilterItem {
  id: string;
  text: string;
  status: string;
}

const mapLineItems = (bill: MappedBill) =>
  bill?.lineItems?.reduce((acc, item) => acc + (acc ? ' & ' : '') + (item.billableService || item.item || ''), '');

const BillsTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { pageSize: defaultPageSize } = useConfig<BillingConfig>();
  const [pageSize, setPageSize] = useState(defaultPageSize ?? 10);
  const pageSizes = [10, 20, 30, 40, 50];
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';

  const billPaymentStatusFilterItems: BillPaymentStatusFilterItem[] = useMemo(
    () => [
      { id: '', text: t('allBills', 'All bills'), status: '' },
      { id: 'PENDING', text: t('pendingBills', 'Pending bills'), status: 'PENDING,POSTED' },
      { id: 'PAID', text: t('paidBills', 'Paid bills'), status: 'PAID' },
    ],
    [t],
  );
  const [billPaymentStatus, setBillPaymentStatus] = useState<BillPaymentStatusFilterItem>(
    billPaymentStatusFilterItems[1],
  );
  const [searchString, setSearchString] = useState('');
  const debouncedSearchString = useDebounce(searchString, 500);
  const { bills, error, currentPage, isLoading, isValidating, totalCount, goTo } = usePaginatedBills(
    pageSize,
    billPaymentStatus.status,
    debouncedSearchString || undefined,
  );

  const headerData = [
    {
      header: t('visitTime', 'Visit time'),
      key: 'dateCreated',
    },
    {
      header: t('patientIdentifier', 'Patient identifier'),
      key: 'identifier',
    },
    {
      header: t('patientName', 'Patient name'),
      key: 'patientNameDisplay',
    },
    {
      header: t('billedItems', 'Billed Items'),
      key: 'billedItems',
    },
  ];

  const billList: Array<BillDisplayItem> = useMemo(() => {
    const billingUrl = '${openmrsSpaBase}/home/billing/patient/${patientUuid}/${uuid}';

    const mappedBills = bills?.map((bill) => {
      const object = {
        ...bill,
        id: String(bill.id),
        patientNameDisplay: (
          <ConfigurableLink
            style={{ textDecoration: 'none', maxWidth: '50%' }}
            to={billingUrl}
            templateParams={{ patientUuid: bill.patientUuid, uuid: bill.uuid }}>
            {bill.patientName}
          </ConfigurableLink>
        ),
        billedItems: mapLineItems(bill),
      };
      return object;
    });

    return mappedBills;
  }, [bills]);

  // Server-side search is now handled by the API, so we just use the bills directly
  const searchResults = billList;

  // Check if user has applied any filters (not "All bills") or search
  const hasActiveFiltersOrSearch = searchString.trim() !== '' || billPaymentStatus.id !== '';

  const handleSearch = useCallback(
    (e) => {
      goTo(1);
      setSearchString(e.target.value);
    },
    [goTo, setSearchString],
  );

  const handleFilterChange = useCallback(
    ({ selectedItem }) => {
      setBillPaymentStatus(selectedItem);
      goTo(1);
    },
    [goTo],
  );

  return (
    <>
      <div className={styles.filterContainer}>
        <Dropdown
          className={styles.filterDropdown}
          direction="bottom"
          id="bill-payment-status-filter"
          initialSelectedItem={billPaymentStatusFilterItems[1]}
          selectedItem={billPaymentStatus}
          items={billPaymentStatusFilterItems}
          itemToString={(item: BillPaymentStatusFilterItem) => (item ? item.text : '')}
          label=""
          onChange={handleFilterChange}
          size={responsiveSize}
          titleText={t('filterBy', 'Filter by:')}
          type="inline"
        />
      </div>

      {isLoading && !bills?.length ? (
        <div className={styles.loaderContainer} role="progressbar" aria-label={t('loading', 'Loading')}>
          <DataTableSkeleton
            rowCount={pageSize}
            showHeader={false}
            showToolbar={false}
            zebra
            columnCount={headerData?.length}
            size={responsiveSize}
          />
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <Layer>
            <ErrorState error={error} headerTitle={t('billList', 'Bill list')} />
          </Layer>
        </div>
      ) : billList?.length > 0 || hasActiveFiltersOrSearch ? (
        <div className={styles.billListContainer}>
          <FilterableTableHeader
            handleSearch={handleSearch}
            isValidating={isValidating}
            layout={layout}
            responsiveSize={responsiveSize}
            searchString={searchString}
            t={t}
          />
          <DataTable
            isSortable
            rows={searchResults}
            headers={headerData}
            size={responsiveSize}
            useZebraStyles={searchResults?.length > 1 ? true : false}>
            {({ rows, headers, getRowProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label={t('billList', 'Bill list')}>
                  <TableHead>
                    <TableRow>
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
          {searchResults?.length === 0 && (
            <div className={styles.filterEmptyState}>
              <Layer level={0}>
                <Tile className={styles.filterEmptyStateTile}>
                  <p className={styles.filterEmptyStateContent}>
                    {t('noMatchingBillsToDisplay', 'No matching bills to display')}
                  </p>
                  <p className={styles.filterEmptyStateHelper}>{t('checkFilters', 'Check the filters above')}</p>
                </Tile>
              </Layer>
            </div>
          )}
          {totalCount > 0 && (
            <Pagination
              forwardText={t('nextPage', 'Next page')}
              backwardText={t('previousPage', 'Previous page')}
              page={currentPage}
              pageSize={pageSize}
              pageSizes={pageSizes}
              totalItems={totalCount}
              onChange={({ pageSize: newPageSize, page }) => {
                if (newPageSize !== pageSize) {
                  // User changed page size, reset to page 1
                  setPageSize(newPageSize);
                  goTo(1);
                } else if (page !== currentPage) {
                  // User navigated to different page
                  goTo(page);
                }
              }}
            />
          )}
        </div>
      ) : (
        <Layer className={styles.emptyStateContainer}>
          <Tile className={styles.tile}>
            <div className={styles.illo}>
              <EmptyDataIllustration />
            </div>
            <p className={styles.content}>{t('noBillsToDisplay', 'There are no bills to display.')}</p>
          </Tile>
        </Layer>
      )}
    </>
  );
};

interface FilterableTableHeaderProps {
  layout: LayoutType;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isValidating: boolean;
  responsiveSize: 'sm' | 'md' | 'lg' | 'xl';
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
          <h4>{t('billList', 'Bill list')}</h4>
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
        autoFocus
        closeButtonLabelText={t('clearSearch', 'Clear')}
        data-testid="billsTableSearchBar"
        labelText={t('searchForPatient', 'Search for a patient')}
        placeholder={t('filterBillsByPatient', 'Filter bills by patient name or identifier')}
        value={searchString}
        onChange={handleSearch}
        size={responsiveSize}
      />
    </>
  );
}

export default BillsTable;
