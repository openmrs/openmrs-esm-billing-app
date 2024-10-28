import React, { useCallback, useId, useMemo, useState } from 'react';
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
  useConfig,
  usePagination,
  ErrorState,
  ConfigurableLink,
} from '@openmrs/esm-framework';
import { EmptyDataIllustration } from '@openmrs/esm-patient-common-lib';
import { useBills } from '../billing.resource';
import styles from './bills-table.scss';

const BillsTable = () => {
  const { t } = useTranslation();
  const id = useId();
  const config = useConfig();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [billPaymentStatus, setBillPaymentStatus] = useState('PENDING');
  const pageSizes = config?.bills?.pageSizes ?? [10, 20, 30, 40, 50];
  const [pageSize, setPageSize] = useState(config?.bills?.pageSize ?? 10);
  const { bills, isLoading, isValidating, error } = useBills('', '');
  const [searchString, setSearchString] = useState('');

  const headerData = [
    {
      header: t('visitTime', 'Visit time'),
      key: 'visitTime',
    },
    {
      header: t('identifier', 'Identifier'),
      key: 'identifier',
    },
    {
      header: t('name', 'Name'),
      key: 'patientName',
    },
    {
      header: t('billedItems', 'Billed Items'),
      key: 'billedItems',
    },
  ];

  const searchResults = useMemo(() => {
    if (!bills?.length) return bills;

    return bills
      .map((bill) => {
        if (bill.payments?.length > 0) {
          const totalPaid = bill.payments.reduce((sum, payment) => sum + payment.amountTendered, 0);
          if (totalPaid >= bill.totalAmount) {
            bill.status = 'PAID';
          }
        }
        return bill;
      })
      .filter((bill) => {
        const statusMatch = billPaymentStatus === '' ? true : bill.status === billPaymentStatus;
        const searchMatch = !searchString
          ? true
          : bill.patientName.toLowerCase().includes(searchString.toLowerCase()) ||
            bill.identifier.toLowerCase().includes(searchString.toLowerCase());

        return statusMatch && searchMatch;
      });
  }, [bills, searchString, billPaymentStatus]);

  const { paginated, goTo, results, currentPage } = usePagination(searchResults, pageSize);

  const setBilledItems = (bill) =>
    bill?.lineItems?.reduce((acc, item) => acc + (acc ? ' & ' : '') + (item.billableService || item.item || ''), '');

  const billingUrl = '${openmrsSpaBase}/home/billing/patient/${patientUuid}/${uuid}';

  const rowData = results?.map((bill, index) => {
    return {
      id: `${index}`,
      uuid: bill.uuid,
      patientName: (
        <ConfigurableLink
          style={{ textDecoration: 'none', maxWidth: '50%' }}
          to={billingUrl}
          templateParams={{ patientUuid: bill.patientUuid, uuid: bill.uuid }}>
          {bill.patientName}
        </ConfigurableLink>
      ),
      visitTime: bill.dateCreated,
      identifier: bill.identifier,
      department: '--',
      billedItems: setBilledItems(bill),
      billingPrice: '--',
    };
  });

  const handleSearch = useCallback(
    (e) => {
      goTo(1);
      setSearchString(e.target.value);
    },
    [goTo, setSearchString],
  );

  const filterItems = [
    { id: '', text: 'All bills' },
    { id: 'PENDING', text: 'Pending bills' },
    { id: 'PAID', text: 'Paid bills' },
  ];

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
          <ErrorState error={error} headerTitle={t('billsList', 'Bill list')} />
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
          id={`filter-${id}`}
          initialSelectedItem={filterItems[1]}
          items={filterItems}
          itemToString={(item) => (item ? item.text : '')}
          label=""
          onChange={handleFilterChange}
          size={responsiveSize}
          titleText={t('filterBy', 'Filter by') + ':'}
          type="inline"
        />
      </div>

      {bills?.length > 0 ? (
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
            rows={rowData}
            headers={headerData}
            size={responsiveSize}
            useZebraStyles={rowData?.length > 1 ? true : false}>
            {({ rows, headers, getRowProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label="bill list">
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
          {paginated && (
            <Pagination
              forwardText="Next page"
              backwardText="Previous page"
              page={currentPage}
              pageSize={pageSize}
              pageSizes={pageSizes}
              totalItems={searchResults?.length}
              className={styles.pagination}
              size={responsiveSize}
              onChange={({ pageSize: newPageSize, page: newPage }) => {
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                }
                if (newPage !== currentPage) {
                  goTo(newPage);
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
