import React, { useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { isDesktop, useConfig, useLayoutType } from '@openmrs/esm-framework';
import type { BillingConfig } from '../config-schema';
import { convertToCurrency } from '../helpers';
import { BillDiscountType, type BillDiscount, type MappedBill } from '../types';
import styles from './discounts-table.scss';

interface Props {
  bill: MappedBill;
}

function resolveScope(d: BillDiscount, bill: MappedBill, fallback: string) {
  if (!d.lineItemUuid) return fallback;
  const li = bill.lineItems?.find((l) => l.uuid === d.lineItemUuid);
  return li?.item || li?.billableService || fallback;
}

const DiscountsTable: React.FC<Props> = ({ bill }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const discounts = useMemo(() => (bill.discounts ?? []).filter((d) => !d.voided), [bill.discounts]);

  const tableHeaders = [
    { header: t('discountItem', 'Item'), key: 'item', width: 25 },
    { header: t('discountType', 'Type'), key: 'type', width: 15 },
    { header: t('discountAmount', 'Amount'), key: 'amount', width: 15 },
    { header: t('justification', 'Justification'), key: 'justification', width: 30 },
    { header: t('status', 'Status'), key: 'status', width: 15 },
  ];

  const tableRows = useMemo(
    () =>
      (discounts ?? []).map((d) => ({
        id: d.uuid,
        item: resolveScope(d, bill, t('wholeBill', 'Whole bill')),
        type:
          d.discountType === BillDiscountType.PERCENTAGE
            ? t('percentage', 'Percentage')
            : t('fixedAmount', 'Fixed amount'),
        amount: convertToCurrency(d.discountAmount, defaultCurrency),
        justification: d.justification,
        status: t(d.status.toLowerCase(), d.status),
      })),
    [discounts, bill, defaultCurrency, t],
  );

  if (!discounts || discounts.length === 0) {
    return null;
  }

  return (
    <div className={styles.discountsWrapper}>
      <DataTable
        headers={tableHeaders}
        rows={tableRows}
        size={responsiveSize}
        useZebraStyles
        overflowMenuOnHover={isDesktop(layout)}>
        {({ rows, headers, getRowProps, getTableProps }) => (
          <TableContainer
            description={
              <span className={styles.tableDescription}>
                <span>{t('discountsAppliedToBill', 'Discounts applied to this bill')}</span>
              </span>
            }
            title={t('discounts', 'Discounts')}>
            <Table
              {...getTableProps()}
              aria-label={t('billDiscounts', 'Bill discounts')}
              className={classNames(styles.discountsTable, 'billingTable')}>
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
  );
};

export default DiscountsTable;
