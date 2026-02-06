import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  InlineLoading,
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
import { Add } from '@carbon/react/icons';
import {
  CardHeader,
  EmptyCardIllustration,
  ErrorState,
  launchWorkspace2,
  useConfig,
  usePagination,
  usePaginationInfo,
} from '@openmrs/esm-framework';
import { useBills } from '../billing.resource';
import { convertToCurrency } from '../helpers';
import InvoiceTable from '../invoice/invoice-table.component';
import styles from './bill-history.scss';

interface BillHistoryProps {
  patientUuid: string;
}

const BillHistory: React.FC<BillHistoryProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { bills, error, isLoading, isValidating, mutate } = useBills(patientUuid);
  const { paginated, goTo, results, currentPage } = usePagination(bills);
  const { pageSize, defaultCurrency } = useConfig();
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, bills?.length, currentPage, results?.length);

  const headerData = [
    {
      header: t('billDate', 'Bill date'),
      key: 'billDate',
    },
    {
      header: t('invoiceNumber', 'Invoice number'),
      key: 'invoiceNumber',
    },
    {
      header: t('billedItems', 'Billed items'),
      key: 'billedItems',
    },
    {
      header: t('billTotal', 'Bill total'),
      key: 'billTotal',
    },
  ];

  const setBilledItems = (bill) =>
    bill?.lineItems
      ?.map((item) => item?.billableService || item?.item)
      .filter(Boolean)
      .join(' & ');

  const rowData = results?.map((bill) => ({
    id: bill.uuid,
    uuid: bill.uuid,
    billTotal: convertToCurrency(bill?.totalAmount, defaultCurrency),
    billDate: bill.dateCreated,
    invoiceNumber: bill.receiptNumber,
    billedItems: setBilledItems(bill),
  }));

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton showHeader={false} showToolbar={false} zebra />
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

  if (bills.length === 0) {
    return (
      <Layer className={styles.emptyStateContainer}>
        <Tile className={styles.tile}>
          <div className={styles.illo}>
            <EmptyCardIllustration />
          </div>
          <p className={styles.content}>{t('noBillsToDisplay', 'There are no bills to display.')}</p>
          <Button
            onClick={() =>
              launchWorkspace2('billing-form-workspace', {
                patientUuid,
                onMutate: mutate,
              })
            }
            kind="ghost">
            {t('addBillItems', 'Add bill items')}
          </Button>
        </Tile>
      </Layer>
    );
  }

  return (
    <div>
      <CardHeader title={t('billingHistory', 'Billing History')}>
        {isValidating && (
          <span>
            <InlineLoading status="active" />
          </span>
        )}
        <Button
          kind="ghost"
          onClick={() =>
            launchWorkspace2('billing-form-workspace', {
              patientUuid,
              onMutate: mutate,
            })
          }
          renderIcon={Add}>
          {t('addBillItems', 'Add bill items')}
        </Button>
      </CardHeader>
      <div className={styles.billHistoryContainer}>
        <DataTable isSortable rows={rowData} headers={headerData} size="md" useZebraStyles>
          {({
            getExpandHeaderProps,
            getHeaderProps,
            getRowProps,
            getTableContainerProps,
            getTableProps,
            headers,
            rows,
          }) => (
            <TableContainer {...getTableContainerProps}>
              <Table className={styles.table} {...getTableProps()} aria-label={t('billList', 'Bill list')}>
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
                          <TableExpandedRow colSpan={headers.length + 1}>
                            <div className={styles.container} key={i}>
                              <InvoiceTable bill={currentBill} onMutate={mutate} isLoadingBill={isValidating} />
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
            size="md"
            onChange={({ page: newPage, pageSize }) => {
              if (newPage !== currentPage) {
                goTo(newPage);
              }
              setCurrentPageSize(pageSize);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BillHistory;
