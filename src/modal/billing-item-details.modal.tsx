import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  Pagination,
  ModalBody,
  ModalHeader,
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
import { useConfig, usePagination, usePaginationInfo } from '@openmrs/esm-framework';

interface BillingItemDetailsModalProps {
  closeModal: () => void;
  bills: MappedBill[];
}

const BillingItemDetailsModal: React.FC<BillingItemDetailsModalProps> = ({ closeModal, bills }) => {
  const { t } = useTranslation();
  const { paginated, goTo, results, currentPage } = usePagination(bills);
  const { pageSize, defaultCurrency } = useConfig();
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const { pageSizes } = usePaginationInfo(pageSize, bills?.length, currentPage, results?.length);

  const headerData = [
    { key: 'invoiceNumber', header: t('invoice', 'Invoice') },
    { key: 'dateCreated', header: t('dateCreated', 'Date Created') },
    { key: 'billedItems', header: t('billedItems', 'Billed Items') },
    { key: 'totalAmount', header: t('totalAmount', 'Total Amount') },
    { key: 'totalPaid', header: t('totalPaid', 'Total Paid') },
    { key: 'pending', header: t('pendingAmount', 'Pending Amount') },
    { key: 'status', header: t('status', 'Status') },
  ];

  const billRows = results.map((bill) => {
    const totalAmount = bill.totalAmount ?? 0;
    const totalPaid = bill.tenderedAmount ?? 0;
    const pending = totalAmount - totalPaid;

    return {
      id: bill.uuid,
      invoiceNumber: bill.receiptNumber,
      dateCreated: bill.dateCreated,
      billedItems: bill.lineItems?.length ?? 0,
      totalAmount: convertToCurrency(totalAmount, defaultCurrency),
      totalPaid: convertToCurrency(totalPaid, defaultCurrency),
      status: bill.status,
      pending: convertToCurrency(pending, defaultCurrency),
    };
  });

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('listOfAllBillingItems', 'List of All Billing Items')} />
      <ModalBody>
        <div>
          <DataTable rows={billRows} headers={headerData} size="md" useZebraStyles>
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
          {paginated && (
            <Pagination
              forwardText={t('nextPage', 'Next page')}
              backwardText={t('previousPage', 'Previous page')}
              page={currentPage}
              pageSize={currentPageSize}
              pageSizes={pageSizes}
              totalItems={bills.length}
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
      </ModalBody>
    </>
  );
};

export default BillingItemDetailsModal;
