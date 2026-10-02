import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  DatePicker,
  DatePickerInput,
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
import { Download } from '@carbon/react/icons';
import { ErrorState, formatDate, isDesktop, parseDate, useLayoutType, usePagination } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useBills } from '../../billing.resource';
import type { MappedBill, Payment } from '../../types';
import styles from './billing-reports.scss';

interface BillingReportRow {
  id: string;
  date: string;
  identifier: string;
  patientName: string;
  billedItems: string;
  amount: string;
  status: string;
  paymentMode: string;
}

const getMonthRange = (): [Date, Date] => {
  const today = new Date();
  return [
    new Date(today.getFullYear(), today.getMonth(), 1),
    new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
  ];
};

const formatPaymentModes = (payments: Payment[] = []) =>
  payments
    .filter((payment) => !payment.voided)
    .map((payment) => {
      const name = payment.instanceType?.name ?? '--';
      return payments.length > 1 ? `${name} (${payment.amountTendered.toLocaleString()})` : name;
    })
    .join(' & ') || '--';

export const createBillingReportRows = (bills: MappedBill[], range: [Date, Date]): BillingReportRow[] =>
  bills
    .filter((bill) => {
      const date = new Date(bill.dateCreated);
      return !Number.isNaN(date.getTime()) && date >= range[0] && date <= range[1];
    })
    .map((bill) => ({
      id: bill.uuid,
      date: formatDate(parseDate(bill.dateCreated), { mode: 'standard', noToday: true, time: false }),
      identifier: bill.identifier || '--',
      patientName: bill.patientName || '--',
      billedItems:
        bill.lineItems
          ?.map((item) => {
            const name = item.item || item.billableService;
            return name ? `${name}${item.quantity > 0 ? ` (${item.quantity})` : ''}` : null;
          })
          .filter(Boolean)
          .join(', ') || '--',
      amount: (bill.netAmount ?? bill.totalAmount ?? 0).toLocaleString(),
      status: bill.status || '--',
      paymentMode: formatPaymentModes(bill.payments),
    }));

const escapeCsvValue = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadCsv = (rows: BillingReportRow[], columns: Array<{ key: keyof BillingReportRow; header: string }>) => {
  const csv = [
    columns.map(({ header }) => escapeCsvValue(header)).join(','),
    ...rows.map((row) => columns.map(({ key }) => escapeCsvValue(row[key])).join(',')),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `billing-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const BillingReports: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const { bills = [], error, isLoading, isValidating } = useBills();
  const [selectedRange, setSelectedRange] = useState<[Date, Date]>(getMonthRange);
  const [appliedRange, setAppliedRange] = useState<[Date, Date]>(getMonthRange);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const columns: Array<{ key: keyof BillingReportRow; header: string }> = useMemo(
    () => [
      { header: t('date', 'Date'), key: 'date' },
      { header: t('identifier', 'Identifier'), key: 'identifier' },
      { header: t('patientName', 'Patient name'), key: 'patientName' },
      { header: t('billedItems', 'Billed items'), key: 'billedItems' },
      { header: t('amount', 'Amount'), key: 'amount' },
      { header: t('billStatus', 'Bill status'), key: 'status' },
      { header: t('paymentMode', 'Payment mode'), key: 'paymentMode' },
    ],
    [t],
  );

  const rows = useMemo(() => createBillingReportRows(bills, appliedRange), [bills, appliedRange]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(term)))
      : rows;
  }, [rows, search]);
  const { currentPage, goTo, results: paginatedRows } = usePagination(filteredRows, pageSize);

  const handleDateChange = useCallback((dates: Date[]) => {
    if (dates.length < 2) return;
    const end = new Date(dates[1]);
    end.setHours(23, 59, 59, 999);
    setSelectedRange([dates[0], end]);
  }, []);

  if (isLoading) {
    return <InlineLoading description={t('loadingBillingReport', 'Loading billing report...')} />;
  }

  if (error) {
    return <ErrorState error={error} headerTitle={t('billReports', 'Billing reports')} />;
  }

  return (
    <div className={styles.reportContainer}>
      <div className={styles.filters}>
        <DatePicker datePickerType="range" dateFormat="d/m/Y" onChange={handleDateChange} value={selectedRange}>
          <DatePickerInput
            id="billing-report-start-date"
            labelText={t('startDate', 'Start date')}
            placeholder="dd/mm/yyyy"
          />
          <DatePickerInput id="billing-report-end-date" labelText={t('endDate', 'End date')} placeholder="dd/mm/yyyy" />
        </DatePicker>
        <Button
          kind="tertiary"
          onClick={() => {
            setAppliedRange(selectedRange);
            goTo(1);
          }}>
          {t('updateReport', 'Update report')}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Search
          labelText={t('searchThisList', 'Search this list')}
          onChange={(event) => {
            setSearch(event.target.value);
            goTo(1);
          }}
          placeholder={t('searchThisList', 'Search this list')}
          size={responsiveSize}
          value={search}
        />
        <Button
          disabled={!filteredRows.length}
          kind="ghost"
          renderIcon={Download}
          onClick={() => downloadCsv(filteredRows, columns)}>
          {t('downloadCsv', 'Download CSV')}
        </Button>
      </div>

      {isValidating && <InlineLoading className={styles.validating} />}
      {filteredRows.length ? (
        <>
          <DataTable rows={paginatedRows} headers={columns} size={responsiveSize} useZebraStyles>
            {({ rows: tableRows, headers, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label={t('billReports', 'Billing reports')}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader key={header.key}>{header.header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow key={row.id}>
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
          <Pagination
            backwardText={t('previousPage', 'Previous page')}
            forwardText={t('nextPage', 'Next page')}
            page={currentPage}
            pageSize={pageSize}
            pageSizes={[10, 20, 30, 40, 50]}
            totalItems={filteredRows.length}
            onChange={({ page, pageSize: nextPageSize }) => {
              setPageSize(nextPageSize);
              goTo(page);
            }}
          />
        </>
      ) : (
        <Layer>
          <Tile className={styles.emptyState}>
            <h4>{t('noBillingReportData', 'No billing data for this date range')}</h4>
            <p>{t('checkFilters', 'Check the filters above')}</p>
          </Tile>
        </Layer>
      )}
    </div>
  );
};

export default BillingReports;
