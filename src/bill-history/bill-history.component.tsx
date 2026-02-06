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
  Tag,
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
import type { BillStatus } from '../types';
import type { BillingConfig } from '../config-schema';
import styles from './bill-history.scss';
import { BillItemActionsMenu } from './bill-item-actions-menu.component';

interface BillHistoryProps {
  patientUuid: string;
}

function getStatusTagType(status: BillStatus) {
  switch (status) {
    case 'PENDING':
      return 'cyan';
    case 'PAID':
      return 'green';
    case 'ADJUSTED':
      return 'teal';
    case 'POSTED':
      return 'blue';
    case 'CANCELLED':
      return 'red';
    case 'EXEMPTED':
      return 'magenta';
    default:
      return 'gray';
  }
}

const BillHistory: React.FC<BillHistoryProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { bills, error, isLoading, isValidating, mutate } = useBills(patientUuid);
  const { paginated, goTo, results, currentPage } = usePagination(bills);
  const { pageSize, defaultCurrency } = useConfig<BillingConfig>();
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, bills?.length, currentPage, results?.length);

  const headerData = [
    {
      header: t('dateCreated', 'Date created'),
      key: 'dateCreated',
    },
    {
      header: t('billedItems', 'Billed Items'),
      key: 'billedItems',
    },
    {
      header: t('billTotal', 'Bill total'),
      key: 'billTotal',
    },
    {
      header: t('billStatus', 'Bill status'),
      key: 'billStatus',
    },
  ];

  const setBilledItems = (bill) =>
    bill?.lineItems?.reduce((acc, item) => acc + (acc ? ' & ' : '') + (item?.billableService || item?.item || ''), '');

  const rowData = bills?.map((bill) => ({
    id: bill.uuid,
    uuid: bill.uuid,
    billTotal: convertToCurrency(bill?.totalAmount, defaultCurrency),
    dateCreated: bill.dateCreated,
    billedItems: setBilledItems(bill),
    billStatus: <Tag type={getStatusTagType(bill.status)}>{bill.status}</Tag>,
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
            {t('createBill', 'Create bill')}
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
          {t('createBill', 'Create bill')}
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
                    <TableHeader aria-label={t('actions', 'Actions')} />
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
                          <TableCell className="cds--table-column-menu" id="actions">
                            <BillItemActionsMenu bill={currentBill} patientUuid={patientUuid} onMutate={mutate} />
                          </TableCell>
                        </TableExpandRow>
                        {row.isExpanded ? (
                          <TableExpandedRow colSpan={headers.length + 2}>
                            <div className={styles.container} key={i}>
                              <InvoiceTable bill={currentBill} onMutate={mutate} isLoadingBill={isValidating} />
                            </div>
                          </TableExpandedRow>
                        ) : (
                          <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 3} />
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
