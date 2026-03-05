import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  DataTableSkeleton,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { convertToCurrency } from '../helpers';
import { type MappedBill } from '../types';
import styles from './payment-status-badge.module.scss';
import { useConfig } from '@openmrs/esm-framework';

interface PaymentStatusDetailsModalProps {
  closeModal: () => void;
  isOpen: boolean;
  bills: MappedBill[];
  isLoading: boolean;
}

const PaymentStatusDetailsModal: React.FC<PaymentStatusDetailsModalProps> = ({
  closeModal,
  isOpen,
  bills,
  isLoading,
}) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig();

  const headerData = [
    {
      header: t('billDate', 'Date'),
      key: 'billDate',
    },
    {
      header: t('invoiceNumber', 'Invoice #'),
      key: 'invoiceNumber',
    },
    {
      header: t('status', 'Status'),
      key: 'status',
    },
    {
      header: t('totalAmount', 'Total'),
      key: 'totalAmount',
    },
    {
      header: t('paidAmount', 'Paid'),
      key: 'paidAmount',
    },
  ];

  const rowData = bills?.map((bill) => ({
    id: bill.uuid,
    billDate: bill.dateCreated,
    invoiceNumber: bill.receiptNumber,
    status: bill.status,
    totalAmount: convertToCurrency(bill.totalAmount, defaultCurrency),
    paidAmount: convertToCurrency(bill.tenderedAmount, defaultCurrency),
  }));

  return (
    <Modal
      open={isOpen}
      onRequestClose={closeModal}
      modalHeading={t('paymentStatusDetails', 'Payment Status Details')}
      passiveModal
      size="lg">
      {isLoading ? (
        <DataTableSkeleton showHeader={false} showToolbar={false} zebra />
      ) : (
        <div className={styles.modalTableContainer}>
          <DataTable rows={rowData} headers={headerData}>
            {({ rows, headers, getHeaderProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
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
        </div>
      )}
    </Modal>
  );
};

export default PaymentStatusDetailsModal;
