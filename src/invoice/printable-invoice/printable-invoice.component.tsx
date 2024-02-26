import React, { useMemo } from 'react';
import {
  DataTable,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableBody,
  TableHeader,
  TableCell,
  DataTableSkeleton,
} from '@carbon/react';
import { age, isDesktop, useLayoutType } from '@openmrs/esm-framework';
import { getGender } from '../../helpers';
import { type MappedBill } from '../../types';
import { useTranslation } from 'react-i18next';
import PrintableFooter from './printable-footer.component';
import PrintableInvoiceHeader from './printable-invoice-header.component';
import styles from './printable-invoice.scss';

type PrintableInvoiceProps = {
  bill: MappedBill;
  patient: fhir.Patient;
  isLoading: boolean;
};

const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ bill, patient, isLoading }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const headerData = [
    { header: 'Inventory item', key: 'billItem' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Unit price', key: 'price' },
    { header: 'Total', key: 'total' },
  ];

  const rowData =
    bill?.lineItems?.map((item) => {
      return {
        id: `${item.uuid}`,
        billItem: item.item,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      };
    }) ?? [];

  const invoiceTotal = {
    'Total Amount': bill?.totalAmount,
    'Amount Tendered': bill?.tenderedAmount,
    'Discount Amount': 0,
    'Amount due': bill?.totalAmount - bill?.tenderedAmount,
  };

  const patientDetails = useMemo(() => {
    return {
      name: `${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0].family}`,
      age: age(patient?.birthDate),
      gender: getGender(patient?.gender, t),
      city: patient?.address?.[0].city,
      county: patient?.address?.[0].district,
      subCounty: patient?.address?.[0].state,
    };
  }, [patient, t]);

  const invoiceDetails = {
    'Invoice #': bill?.receiptNumber,
    'Invoice date': bill.dateCreated,
    Status: bill?.status,
  };

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <DataTableSkeleton
          columnCount={headerData?.length ?? 0}
          showHeader={false}
          showToolbar={false}
          size={responsiveSize}
          zebra
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PrintableInvoiceHeader patientDetails={patientDetails} />
      <div className={styles.printableInvoiceContainer}>
        <div className={styles.detailsContainer}>
          {Object.entries(invoiceDetails).map(([key, val]) => (
            <div key={key} className={styles.item}>
              <p className={styles.itemHeading}>{key}</p>
              <span>{val}</span>
            </div>
          ))}
        </div>

        <div className={styles.itemsContainer}>
          <div className={styles.tableContainer}>
            <DataTable isSortable rows={rowData} headers={headerData} size={responsiveSize} useZebraStyles={false}>
              {({ rows, headers, getRowProps, getTableProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} aria-label="Invoice line items">
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
          </div>

          <div className={styles.totalContainer}>
            {Object.entries(invoiceTotal).map(([key, val]) => (
              <p key={key} className={styles.itemTotal}>
                <span className={styles.itemHeading}>{key}</span>: <span className={styles.itemLabel}>{val}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
      <PrintableFooter />
    </div>
  );
};

export default PrintableInvoice;
