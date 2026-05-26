import React, { useCallback, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { isDesktop, showSnackbar, useConfig, useLayoutType, useSession } from '@openmrs/esm-framework';
import type { BillingConfig } from '../config-schema';
import { convertToCurrency } from '../helpers';
import { actOnRefund } from './refunds.resource';
import { RefundStatus, type BillRefund, type MappedBill } from '../types';
import styles from './refunds-table.scss';

interface Props {
  bill: MappedBill;
  onMutate?: () => void;
}

function resolveScope(r: BillRefund, bill: MappedBill, fallback: string) {
  if (!r.lineItemUuid) return fallback;
  const li = bill.lineItems?.find((l) => l.uuid === r.lineItemUuid);
  return li?.item || li?.billableService || fallback;
}

const RefundsTable: React.FC<Props> = ({ bill, onMutate }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const session = useSession();
  const layout = useLayoutType();
  const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';
  const [processingId, setProcessingId] = useState<string | null>(null);

  const tableHeaders = [
    { header: t('refundItem', 'Item'), key: 'item' },
    { header: t('refundAmount', 'Refund amount'), key: 'amount' },
    { header: t('reason', 'Reason'), key: 'reason' },
    { header: t('status', 'Status'), key: 'status' },
    { header: t('action', 'Action'), key: 'action' },
  ];

  const refunds = useMemo(() => (bill.refunds ?? []).filter((r) => !r.voided), [bill.refunds]);

  const handleProcess = useCallback(
    async (r: BillRefund) => {
      setProcessingId(r.uuid);
      try {
        await actOnRefund(r.uuid, { status: RefundStatus.COMPLETED, completer: session.user?.uuid });
        showSnackbar({ title: t('refundProcessed', 'Refund processed'), kind: 'success' });
        onMutate?.();
      } catch (err: unknown) {
        const subtitle = (err as any)?.responseBody?.error?.message ?? (err instanceof Error ? err.message : undefined);
        showSnackbar({ title: t('refundProcessFailed', 'Could not process refund'), subtitle, kind: 'error' });
      } finally {
        setProcessingId(null);
      }
    },
    [onMutate, session.user?.uuid, t],
  );

  const tableRows = useMemo(
    () =>
      (refunds ?? []).map((r) => ({
        id: r.uuid,
        item: resolveScope(r, bill, t('wholeBill', 'Whole bill')),
        amount: convertToCurrency(r.refundAmount, defaultCurrency),
        reason: r.reason,
        status: t(r.status.toLowerCase(), r.status),
        action: (
          <Button
            kind="primary"
            size="sm"
            disabled={processingId === r.uuid || r.status !== RefundStatus.APPROVED}
            onClick={() => handleProcess(r)}>
            {processingId === r.uuid ? (
              <InlineLoading description={t('processing', 'Processing') + '...'} />
            ) : (
              t('processRefund', 'Process refund')
            )}
          </Button>
        ),
      })),
    [refunds, bill, defaultCurrency, processingId, t, handleProcess],
  );

  if (!refunds || refunds.length === 0) {
    return null;
  }

  return (
    <div className={styles.refundsWrapper}>
      <DataTable headers={tableHeaders} rows={tableRows} size={responsiveSize} useZebraStyles>
        {({ rows, headers, getRowProps, getTableProps }) => (
          <TableContainer
            description={
              <span className={styles.tableDescription}>
                <span>{t('refundsOnBill', 'Refunds on this bill')}</span>
              </span>
            }
            title={t('refunds', 'Refunds')}>
            <Table
              {...getTableProps()}
              aria-label={t('billRefunds', 'Bill refunds')}
              className={classNames(styles.refundsTable, 'billingTable')}>
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

export default RefundsTable;
