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
import { formatDate, isDesktop, type SessionLocation, useConfig, useLayoutType } from '@openmrs/esm-framework';
import { getGender } from '../../helpers';
import { type MappedBill } from '../../types';
import { useTranslation } from 'react-i18next';
import PrintableFooter from './printable-footer.component';
import PrintableInvoiceHeader from './printable-invoice-header.component';
import styles from './printable-invoice.scss';
import { type BillingConfig } from '../../config-schema';

type PrintableInvoiceProps = {
  bill: MappedBill;
  patient: fhir.Patient;
  componentRef: React.RefObject<HTMLDivElement>;
  defaultFacility: SessionLocation;
};

const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ bill, patient, componentRef, defaultFacility }) => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const { defaultCurrency } = useConfig<BillingConfig>();
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
        billItem: item.billableService ? item.billableService : item.item,
        quantity: item.quantity,
        price: `${defaultCurrency} ${item.price}`,
        total: `${defaultCurrency} ${item.price * item.quantity}`,
      };
    }) ?? [];

  const paymentHistoryHeaders = [
    {
      key: 'no',
      header: t('no', 'No'),
    },
    {
      key: 'paymentMethod',
      header: t('paymentMethod', 'Payment method'),
    },

    {
      key: 'amountPaid',
      header: t('amountPaid', 'Amount paid'),
    },
    {
      key: 'dateCreated',
      header: t('dateOfPayment', 'Date of payment'),
    },
  ];

  const paymentHistoryRows = useMemo(() => {
    if (bill) {
      return bill.payments?.map((payment, index) => {
        return {
          no: index + 1,
          id: `${payment.uuid}-${index}`,
          paymentMethod: payment.instanceType.name,
          amountPaid: `${defaultCurrency} ${payment.amountTendered.toFixed(2)}`,
          dateCreated: formatDate(new Date(payment.dateCreated)),
        };
      });
    }
    return [];
  }, [bill, defaultCurrency]);

  const summaryHeaders = [
    { key: 'total', header: t('totalAmount', 'Total Amount') },
    { key: 'paid', header: t('totalPaid', 'Total Paid') },
    { key: 'balance', header: t('amountBalance', 'Amount Balance') },
  ];

  const summaryRowData = useMemo(() => {
    if (!bill) {
      return [];
    }
    const balance = bill.totalAmount - bill.tenderedAmount;
    return [
      {
        id: 'summary-1',
        total: `${defaultCurrency} ${bill.totalAmount.toFixed(2)}`,
        paid: `${defaultCurrency} ${bill.tenderedAmount.toFixed(2)}`,
        balance: `${defaultCurrency} ${balance.toFixed(2)}`,
      },
    ];
  }, [bill, defaultCurrency]);

  const patientDetails = useMemo(() => {
    const address = patient?.address?.[0];
    const addressParts = [address?.line?.join(' '), address?.city, address?.district, address?.state].filter(Boolean);
    const formattedAddress = addressParts.join(', ');

    return {
      name: `${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0].family}`,
      birthDate: patient?.birthDate,
      gender: getGender(patient?.gender, t),
      address: formattedAddress,
    };
  }, [patient, t]);

  return (
    <div className={styles.container} ref={componentRef}>
      <PrintableInvoiceHeader patientDetails={patientDetails} defaultFacility={defaultFacility} bill={bill} />

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
          <div className={styles.summaryContainer}>
            <DataTable rows={summaryRowData} headers={summaryHeaders} size={responsiveSize}>
              {({ rows, headers, getRowProps, getTableProps }) => (
                <TableContainer>
                  <Table {...getTableProps()} aria-label={t('invoiceSummary', 'Invoice Summary')}>
                    <TableHead>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHeader key={header.key}>{header.header}</TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id} {...getRowProps({ row })}>
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
          {bill?.payments?.length > 0 && (
            <div className={styles.paymentHistoryContainer}>
              <DataTable rows={paymentHistoryRows} headers={paymentHistoryHeaders} size={responsiveSize}>
                {({ rows, headers, getRowProps, getTableProps }) => (
                  <TableContainer>
                    <Table {...getTableProps()} aria-label={t('paymentHistory', 'Payment History')}>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader key={header.key}>{header.header}</TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
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
          )}
          <div className={styles.balanceContainer}>
            <span className={styles.itemHeading}>{t('balance', 'Balance')}:</span>{' '}
            <span className={styles.itemLabel}>
              {' '}
              <strong>
                {defaultCurrency} {bill?.totalAmount - bill?.tenderedAmount}
              </strong>
            </span>
          </div>
        </div>
      </div>
      <PrintableFooter />
    </div>
  );
};

export default PrintableInvoice;
