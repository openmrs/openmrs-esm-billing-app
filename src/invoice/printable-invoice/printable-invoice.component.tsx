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
} from '@carbon/react';
import { age, isDesktop, type SessionLocation, useLayoutType } from '@openmrs/esm-framework';
import { getGender } from '../../helpers';
import { type MappedBill } from '../../types';
import { useTranslation } from 'react-i18next';
import PrintableFooter from './printable-footer.component';
import PrintableInvoiceHeader from './printable-invoice-header.component';
import styles from './printable-invoice.scss';

type PrintableInvoiceProps = {
  bill: MappedBill;
  patient: fhir.Patient;
  componentRef: React.RefObject<HTMLDivElement>;
  defaultFacility: SessionLocation;
};

const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ bill, patient, componentRef, defaultFacility }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const headerData = [
    { header: t('inventoryItem', 'Inventory item'), key: 'billItem' },
    { header: t('quantity', 'Quantity'), key: 'quantity' },
    { header: t('unitPrice', 'Unit price'), key: 'price' },
    { header: t('total', 'Total'), key: 'total' },
  ];

  const rowData =
    bill?.lineItems?.map((item) => {
      return {
        id: `${item.uuid}`,
        billItem: item.billableService ?? item.item,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      };
    }) ?? [];

  const invoiceTotal = {
    [t('totalAmount', 'Total amount')]: bill?.totalAmount,
    [t('amountTendered', 'Amount tendered')]: bill?.tenderedAmount,
    [t('discountAmount', 'Discount amount')]: 0,
    [t('amountDue', 'Amount due')]: bill?.totalAmount - bill?.tenderedAmount,
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
    [t('invoiceNumber', 'Invoice #')]: bill?.receiptNumber,
    [t('invoiceDate', 'Invoice date')]: bill?.dateCreated,
    [t('status', 'Status')]: bill?.status,
  };

  return (
    <div className={styles.container} ref={componentRef}>
      <PrintableInvoiceHeader patientDetails={patientDetails} defaultFacility={defaultFacility} />
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
            <DataTable rows={rowData} headers={headerData} size={responsiveSize} useZebraStyles={false}>
              {({ rows, headers, getRowProps, getTableProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} aria-label={t('invoiceLineItems', 'Invoice line items')}>
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
