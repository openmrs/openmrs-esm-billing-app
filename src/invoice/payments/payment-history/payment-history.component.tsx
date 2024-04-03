import React from 'react';
import { DataTable, Table, TableHead, TableRow, TableHeader, TableBody, TableCell } from '@carbon/react';
import { type MappedBill } from '../../../types';
import { formatDate, useConfig } from '@openmrs/esm-framework';
import { convertToCurrency } from '../../../helpers';

type PaymentHistoryProps = {
  bill: MappedBill;
};

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ bill }) => {
  const { defaultCurrency } = useConfig();
  const headers = [
    {
      key: 'dateCreated',
      header: 'Date of payment',
    },
    {
      key: 'amount',
      header: 'Bill amount',
    },
    {
      key: 'amountTendered',
      header: 'Amount tendered',
    },
    {
      key: 'paymentMethod',
      header: 'Payment method',
    },
  ];
  const rows = bill?.payments?.map((payment, index) => {
    return {
      id: `${payment.uuid}-${index}`,
      dateCreated: formatDate(new Date(payment.dateCreated)),
      amountTendered: convertToCurrency(payment.amountTendered, defaultCurrency),
      amount: convertToCurrency(payment.amount, defaultCurrency),
      paymentMethod: payment.instanceType.name,
    };
  });

  if (Object.values(bill?.payments ?? {}).length === 0) {
    return;
  }

  return (
    <DataTable size="sm" rows={rows} headers={headers}>
      {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
        <Table {...getTableProps()}>
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow {...getRowProps({ row })}>
                {row.cells.map((cell) => (
                  <TableCell key={cell.id}>{cell.value}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DataTable>
  );
};

export default PaymentHistory;
