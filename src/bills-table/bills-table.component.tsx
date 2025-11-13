import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import {
  DataTable,
  DataTableSkeleton,
  Dropdown,
  InlineLoading,
  Layer,
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
  usePagination,
  ErrorState,
  ConfigurableLink,
  useConfig,
} from '@openmrs/esm-framework';
import { EmptyDataIllustration, usePaginationInfo } from '@openmrs/esm-patient-common-lib';
import { usePaginatedBills } from '../billing.resource';
import type { MappedBill } from '../types';
import type { BillingConfig } from '../config-schema';
import styles from './bills-table.scss';

interface BillDisplayItem extends MappedBill {
  patientNameDisplay: React.ReactNode;
  billedItems: string;
}

const BillsTable: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { pageSize: defaultPageSize } = useConfig<BillingConfig>();
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const pageSizes = [10, 20, 30, 40, 50];
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [billPaymentStatus, setBillPaymentStatus] = useState('PENDING');
  const [searchString, setSearchString] = useState('');
  const { bills, error, isLoading, isValidating, currentPage, totalCount, goTo } = usePaginatedBills(pageSize);

  const billPaymentStatusFilterItems = [
    { id: '', text: t('allBills', 'All bills') },
    { id: 'PENDING', text: t('pendingBills', 'Pending bills') },
    { id: 'PAID', text: t('paidBills', 'Paid bills') },
  ];

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

  const mapLineItems = (bill: MappedBill) =>
    bill?.lineItems?.reduce((acc, item) => acc + (acc ? ' & ' : '') + (item.billableService || item.item || ''), '');

  const billList: Array<BillDisplayItem> = useMemo(() => {
    const billingUrl = '${openmrsSpaBase}/home/billing/patient/${patientUuid}/${uuid}';

    const mappedBills = bills?.map((bill) => {
      const object = {
        ...bill,
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

  const searchResults = useMemo(() => {
    if (!billList?.length) return billList;

    return billList.filter((bill) => {
      const statusMatch = billPaymentStatus === '' ? true : bill.status === billPaymentStatus;
      const searchMatch = !searchString
        ? true
        : bill.patientName?.toLowerCase().includes(searchString.toLowerCase()) ||
          bill.identifier?.toLowerCase().includes(searchString.toLowerCase());

      return statusMatch && searchMatch;
    });
  }, [billList, searchString, billPaymentStatus]);

  const { paginated, results } = usePagination(searchResults, pageSize);

  const handleSearch = useCallback(
    (e) => {
      goTo(1);
      setSearchString(e.target.value);
    },
    [goTo, setSearchString],
  );

  const handleFilterChange = ({ selectedItem }) => {
    setBillPaymentStatus(selectedItem.id);
  };

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton
          rowCount={pageSize}
          showHeader={false}
          showToolbar={false}
          zebra
          columnCount={headerData?.length}
          size={responsiveSize}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Layer>
          <ErrorState error={error} headerTitle={t('billList', 'Bill list')} />
        </Layer>
      </div>
    );
  }

  return (
    <>
      <div className={styles.filterContainer}>
        <Dropdown
          className={styles.filterDropdown}
          direction="bottom"
          id="bill-payment-status-filter"
          initialSelectedItem={billPaymentStatusFilterItems[1]}
          items={billPaymentStatusFilterItems}
          itemToString={(item) => (item ? item.text : '')}
          label=""
          onChange={handleFilterChange}
          size={responsiveSize}
          titleText={t('filterBy', 'Filter by:')}
          type="inline"
        />
      </div>

      {results?.length > 0 ? (
        <div className={styles.billListContainer}>
          <FilterableTableHeader
            handleSearch={handleSearch}
            isValidating={isValidating}
            layout={layout}
            responsiveSize={responsiveSize}
            t={t}
          />
          <DataTable
            isSortable
            rows={results}
            headers={headerData}
            size={responsiveSize}
            useZebraStyles={results?.length > 1 ? true : false}>
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
          <Pagination
            forwardText={t('nextPage', 'Next page')}
            backwardText={t('previousPage', 'Previous page')}
            page={currentPage}
            pageSize={pageSize}
            pageSizes={pageSizes}
            totalItems={totalCount}
            onChange={({ pageSize, page }) => {
              setPageSize(pageSize);
              if (page !== currentPage) {
                goTo(page);
              }
            }}
          />
        </div>
      ) : (
        <Layer className={styles.emptyStateContainer}>
          <Tile className={styles.tile}>
            <div className={styles.illo}>
              <EmptyDataIllustration />
            </div>
            <p className={styles.content}>There are no bills to display.</p>
          </Tile>
        </Layer>
      )}
    </>
  );
};

function FilterableTableHeader({ layout, handleSearch, isValidating, responsiveSize, t }) {
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
        <div className={styles.backgroundDataFetchingIndicator}>
          <span>{isValidating ? <InlineLoading /> : null}</span>
        </div>
      </div>
      <Search
        labelText=""
        placeholder={t('filterTable', 'Filter table')}
        onChange={handleSearch}
        size={responsiveSize}
      />
    </>
  );
}

export default BillsTable;
