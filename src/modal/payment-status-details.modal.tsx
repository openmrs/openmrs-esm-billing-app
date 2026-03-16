import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTableSkeleton,
  Modal,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useConfig, usePagination, usePaginationInfo } from '@openmrs/esm-framework';
import { convertToCurrency } from '../helpers';
import { type MappedBill } from '../types';
import styles from '../patient-banner-payment-status/payment-status-badge.module.scss';

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
  const { defaultCurrency, pageSize } = useConfig();
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  const rows = useMemo(
    () =>
      bills?.flatMap((bill) =>
        (bill.lineItems ?? []).map((lineItem) => ({
          id: `${bill.uuid}-${lineItem.uuid ?? lineItem.billableService ?? lineItem.item}`,
          billDate: bill.dateCreated,
          invoiceNumber: bill.receiptNumber,
          billedItem: lineItem.billableService || lineItem.item || '--',
          status: lineItem.paymentStatus,
          quantity: lineItem.quantity,
          total: convertToCurrency((lineItem.price ?? 0) * (lineItem.quantity ?? 0), defaultCurrency),
        })),
      ) ?? [],
    [bills, defaultCurrency],
  );
  const { paginated, goTo, results, currentPage } = usePagination(rows);
  const { pageSizes } = usePaginationInfo(pageSize, rows.length, currentPage, results?.length);

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
          <TableContainer>
            <Table aria-label={t('paymentStatusDetails', 'Payment Status Details')}>
              <TableHead>
                <TableRow>
                  <TableHeader>{t('billDate', 'Date')}</TableHeader>
                  <TableHeader>{t('invoiceNumber', 'Invoice #')}</TableHeader>
                  <TableHeader>{t('billedItem', 'Billed item')}</TableHeader>
                  <TableHeader>{t('status', 'Status')}</TableHeader>
                  <TableHeader>{t('quantity', 'Quantity')}</TableHeader>
                  <TableHeader>{t('totalAmount', 'Total')}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.billDate}</TableCell>
                    <TableCell>{row.invoiceNumber}</TableCell>
                    <TableCell>{row.billedItem}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {paginated ? (
            <Pagination
              forwardText={t('nextPage', 'Next page')}
              backwardText={t('previousPage', 'Previous page')}
              page={currentPage}
              pageSize={currentPageSize}
              pageSizes={pageSizes}
              totalItems={rows.length}
              size="md"
              onChange={({ page: newPage, pageSize }) => {
                if (newPage !== currentPage) {
                  goTo(newPage);
                }
                setCurrentPageSize(pageSize);
              }}
            />
          ) : null}
        </div>
      )}
    </Modal>
  );
};

export default PaymentStatusDetailsModal;
