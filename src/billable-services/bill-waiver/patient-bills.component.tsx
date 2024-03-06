import React from 'react';
import {
  DataTable,
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
import { useTranslation } from 'react-i18next';
import { EmptyDataIllustration } from '@openmrs/esm-patient-common-lib';
import { type MappedBill } from '../../types';
import { convertToCurrency } from '../../helpers';
import PatientBillsSelections from './bill-selection.component';
import styles from '../../bills-table/bills-table.scss';
import { useConfig } from '@openmrs/esm-framework';

type PatientBillsProps = {
  patientUuid: string;
  bills: Array<MappedBill>;
  setPatientUuid: (patientUuid: string) => void;
};

const PatientBills: React.FC<PatientBillsProps> = ({ patientUuid, bills, setPatientUuid }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig();

  if (!patientUuid) {
    return;
  }

  const tableHeaders = [
    { header: 'Date', key: 'date' },
    { header: 'Billable Service', key: 'billableService' },
    { header: 'Total Amount', key: 'totalAmount' },
  ];

  const tableRows = bills.map((bill) => ({
    id: `${bill.uuid}`,
    date: bill.dateCreated,
    billableService: bill.billingService,
    totalAmount: convertToCurrency(bill?.totalAmount, defaultCurrency),
  }));

  if (bills.length === 0 && patientUuid !== '') {
    return (
      <>
        <div style={{ marginTop: '0.625rem' }}>
          <Layer className={styles.emptyStateContainer}>
            <Tile className={styles.tile}>
              <div className={styles.illo}>
                <EmptyDataIllustration />
              </div>
              <p className={styles.content}>{t('noBilltoDisplay', 'There are no bills to display for this patient')}</p>
            </Tile>
          </Layer>
        </div>
      </>
    );
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <DataTable
        rows={tableRows}
        headers={tableHeaders}
        size="sm"
        useZebraStyles
        render={({
          rows,
          headers,
          getHeaderProps,
          getExpandHeaderProps,
          getRowProps,
          getExpandedRowProps,
          getTableProps,
          getTableContainerProps,
        }) => (
          <TableContainer
            title={t('patientBills', 'Patient bill')}
            description={t('patientBillsDescription', 'List of patient bills')}
            {...getTableContainerProps()}>
            <Table {...getTableProps()} aria-label="sample table">
              <TableHead>
                <TableRow>
                  <TableExpandHeader enableToggle={true} {...getExpandHeaderProps()} />
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
                {rows.map((row, index) => (
                  <React.Fragment key={row.id}>
                    <TableExpandRow
                      {...getRowProps({
                        row,
                      })}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableExpandRow>
                    <TableExpandedRow
                      colSpan={headers.length + 1}
                      className="demo-expanded-td"
                      {...getExpandedRowProps({
                        row,
                      })}>
                      <div>
                        <PatientBillsSelections bills={bills[index]} setPatientUuid={setPatientUuid} />
                      </div>
                    </TableExpandedRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      />
    </div>
  );
};

export default PatientBills;
