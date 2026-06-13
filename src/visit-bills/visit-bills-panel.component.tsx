import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  Layer,
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
import { EmptyCardIllustration, ErrorState, formatDate, parseDate, useConfig } from '@openmrs/esm-framework';
import { useBills } from '../billing.resource';
import { convertToCurrency } from '../helpers';
import InvoiceTable from '../invoice/invoice-table.component';
import type { BillingConfig } from '../config-schema';
import styles from './visit-bills-panel.scss';

interface VisitBillsPanelProps {
  visit: { uuid: string };
  patientUuid: string;
}

const VisitBillsPanel: React.FC<VisitBillsPanelProps> = ({ visit, patientUuid }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const { bills, error, isLoading, isValidating, mutate } = useBills(patientUuid, '');
  const billsByUuid = useMemo(() => new Map(bills?.map((bill) => [bill.uuid, bill])), [bills]);

  const headerData = [
    { header: t('billDate', 'Bill date'), key: 'billDate' },
    { header: t('invoiceNumber', 'Invoice number'), key: 'invoiceNumber' },
    { header: t('billedItems', 'Billed items'), key: 'billedItems' },
    { header: t('billTotal', 'Bill total'), key: 'billTotal' },
  ];

  const setBilledItems = (bill) =>
    bill?.lineItems
      ?.map((item) => item?.billableService || item?.item)
      .filter(Boolean)
      .join(' & ') || '--';

  const formatBillDate = (dateCreated: string) => {
    try {
      return formatDate(parseDate(dateCreated), { mode: 'wide' });
    } catch {
      return '--';
    }
  };

  const rowData = bills?.map((bill) => ({
    id: bill.uuid,
    billDate: bill.dateCreated ? formatBillDate(bill.dateCreated) : '--',
    invoiceNumber: bill.receiptNumber,
    billedItems: setBilledItems(bill),
    billTotal: convertToCurrency(bill.totalAmount ?? 0, defaultCurrency),
  }));

  if (isLoading) {
    return <DataTableSkeleton showHeader={false} showToolbar={false} zebra />;
  }

  if (error) {
    return (
      <Layer>
        <ErrorState error={error} headerTitle={t('billList', 'Bill list')} />
      </Layer>
    );
  }

  if (!bills?.length) {
    return (
      <Layer className={styles.emptyStateContainer}>
        <Tile className={styles.tile}>
          <div className={styles.illo}>
            <EmptyCardIllustration />
          </div>
          <p className={styles.content}>{t('noBillsToDisplay', 'There are no bills to display.')}</p>
        </Tile>
      </Layer>
    );
  }

  return (
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
        <TableContainer {...getTableContainerProps()}>
          <Table {...getTableProps()} aria-label={t('billList', 'Bill list')}>
            <TableHead>
              <TableRow>
                <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                {headers.map((header) => (
                  <TableHeader key={header.key} {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const currentBill = billsByUuid.get(row.id);
                return (
                  <React.Fragment key={row.id}>
                    <TableExpandRow {...getRowProps({ row })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableExpandRow>
                    {row.isExpanded ? (
                      <TableExpandedRow colSpan={headers.length + 1}>
                        {currentBill ? (
                          <InvoiceTable bill={currentBill} onMutate={mutate} isLoadingBill={isValidating} viewOnly />
                        ) : (
                          <InlineNotification
                            kind="error"
                            lowContrast
                            title={t('billNotFound', 'Bill details could not be loaded')}
                          />
                        )}
                      </TableExpandedRow>
                    ) : (
                      <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 1} />
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
};

export default VisitBillsPanel;
