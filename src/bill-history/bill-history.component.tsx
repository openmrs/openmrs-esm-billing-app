import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Layer,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { isDesktop, useConfig, useLayoutType, usePagination } from '@openmrs/esm-framework';
import {
  CardHeader,
  EmptyDataIllustration,
  ErrorState,
  launchPatientWorkspace,
  usePaginationInfo,
} from '@openmrs/esm-patient-common-lib';
import { useBills } from '../billing.resource';
import InvoiceTable from '../invoice/invoice-table.component';
import styles from './bill-history.scss';
import { Add } from '@carbon/react/icons';
import { convertToCurrency } from '../helpers';

interface BillHistoryProps {
  patientUuid: string;
}

const BillHistory: React.FC<BillHistoryProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { bills, isLoading, error } = useBills(patientUuid);
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const { paginated, goTo, results, currentPage } = usePagination(bills);
  const { pageSize, defaultCurrency } = useConfig();
  const [currentPageSize, setCurrentPageSize] = React.useState(pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, bills?.length, currentPage, results?.length);

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
      header: t('billedItems', 'Billed Items'),
      key: 'billedItems',
    },
    {
      header: t('billTotal', 'Bill total'),
      key: 'billTotal',
    },
  ];

  const setBilledItems = (bill) =>
    bill?.lineItems?.reduce((acc, item) => acc + (acc ? ' & ' : '') + (item?.billableService || item?.item || ''), '');

  const rowData = results?.map((bill) => ({
    id: bill.uuid,
    uuid: bill.uuid,
    billTotal: convertToCurrency(bill?.totalAmount, defaultCurrency),
    visitTime: bill.dateCreated,
    identifier: bill.identifier,
    billedItems: setBilledItems(bill),
  }));

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton showHeader={false} showToolbar={false} zebra size={responsiveSize} />
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

  if (bills.length === 0) {
    return (
      <Layer className={styles.emptyStateContainer}>
        <Tile className={styles.tile}>
          <div className={styles.illo}>
            <EmptyDataIllustration />
          </div>
          <p className={styles.content}>There are no bills to display.</p>
          <Button onClick={() => launchPatientWorkspace('billing-form-workspace')} kind="ghost">
            {t('launchBillForm', 'Launch bill form')}
          </Button>
        </Tile>
      </Layer>
    );
  }

  return (
    <>
      <CardHeader title={t('billingHistory', 'Billing History')}>
        <Button renderIcon={Add} onClick={() => launchPatientWorkspace('billing-form-workspace', {})} kind="ghost">
          {t('addBill', 'Add bill item(s)')}
        </Button>
      </CardHeader>
      <div className={styles.billHistoryContainer}>
        <DataTable isSortable rows={rowData} headers={headerData} size={responsiveSize} useZebraStyles>
          {({
            rows,
            headers,
            getExpandHeaderProps,
            getTableProps,
            getTableContainerProps,
            getHeaderProps,
            getRowProps,
          }) => (
            <TableContainer {...getTableContainerProps}>
              <Table className={styles.table} {...getTableProps()} aria-label="Bill list">
                <TableHead>
                  <TableRow>
                    <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                    {headers.map((header, i) => (
                      <TableHeader
                        key={i}
                        {...getHeaderProps({
                          header,
                        })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => {
                    const currentBill = bills?.find((bill) => bill.uuid === row.id);

                    return (
                      <React.Fragment key={row.id}>
                        <TableExpandRow {...getRowProps({ row })}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id} className={styles.tableCells}>
                              {cell.value}
                            </TableCell>
                          ))}
                        </TableExpandRow>
                        {row.isExpanded ? (
                          <TableExpandedRow className={styles.expandedRow} colSpan={headers.length + 1}>
                            <div className={styles.container} key={i}>
                              <InvoiceTable bill={currentBill} isSelectable={false} />
                            </div>
                          </TableExpandedRow>
                        ) : (
                          <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 2} />
                        )}
                      </React.Fragment>
                    );
                  })}
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
            totalItems={bills.length}
            className={styles.pagination}
            size={responsiveSize}
            onChange={({ page: newPage, pageSize }) => {
              if (newPage !== currentPage) {
                goTo(newPage);
              }
              setCurrentPageSize(pageSize);
            }}
          />
        )}
      </div>
    </>
  );
};

export default BillHistory;
