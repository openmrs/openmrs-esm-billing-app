import React from 'react';
import {
  Button,
  DataTable,
  InlineLoading,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { showModal, getCoreTranslation, ErrorState } from '@openmrs/esm-framework';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import styles from './payment-modes-config.scss';
import { usePaymentModes } from '../billable-service.resource';

const PaymentModesConfig: React.FC = () => {
  const { t } = useTranslation();
  const { paymentModes, error, isLoadingPaymentModes, mutate } = usePaymentModes();

  const handleAddPaymentMode = () => {
    const dispose = showModal('add-payment-mode-modal', {
      onPaymentModeAdded: mutate,
      closeModal: () => dispose(),
    });
  };

  const handleDeletePaymentMode = (paymentMode: any) => {
    const dispose = showModal('delete-payment-mode-modal', {
      paymentModeUuid: paymentMode.uuid,
      paymentModeName: paymentMode.name,
      onPaymentModeDeleted: mutate,
      closeModal: () => dispose(),
    });
  };

  const handleEditPaymentMode = (paymentMode: any) => {
    const dispose = showModal('add-payment-mode-modal', {
      onPaymentModeAdded: mutate,
      editPaymentMode: paymentMode,
      closeModal: () => dispose(),
    });
  };

  const rowData = paymentModes.map((mode) => ({
    id: mode.uuid,
    name: mode.name,
    description: mode.description || '--',
  }));

  const headerData = [
    { key: 'name', header: t('name', 'Name') },
    { key: 'description', header: t('description', 'Description') },
    { key: 'actions', header: getCoreTranslation('actions') },
  ];

  if (isLoadingPaymentModes) {
    return (
      <InlineLoading
        status="active"
        iconDescription={getCoreTranslation('loading')}
        description={t('loading', 'Loading data') + '...'}
      />
    );
  }

  if (error) {
    return <ErrorState headerTitle={t('paymentMode', 'Payment mode')} error={error} />;
  }
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <CardHeader title={t('paymentModeHistory', 'Payment mode history')}>
          <Button renderIcon={Add} onClick={handleAddPaymentMode} kind="ghost">
            {t('addNewPaymentMode', 'Add new payment mode')}
          </Button>
        </CardHeader>
        <DataTable rows={rowData} headers={headerData} isSortable size="lg">
          {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table className={styles.table} {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader key={header.key} {...getHeaderProps({ header })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} {...getRowProps({ row })}>
                      {row.cells.map((cell) =>
                        cell.info.header !== 'actions' ? (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ) : (
                          <TableCell key={cell.id}>
                            <OverflowMenu>
                              <OverflowMenuItem
                                className={styles.menuItem}
                                itemText={getCoreTranslation('edit')}
                                onClick={() => {
                                  const selected = paymentModes.find((p) => p.uuid === row.id);
                                  handleEditPaymentMode(selected);
                                }}
                              />
                              <OverflowMenuItem
                                className={styles.menuItem}
                                itemText={getCoreTranslation('delete')}
                                onClick={() => {
                                  const selected = paymentModes.find((p) => p.uuid === row.id);
                                  handleDeletePaymentMode(selected);
                                }}
                              />
                            </OverflowMenu>
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      </div>
    </div>
  );
};

export default PaymentModesConfig;
