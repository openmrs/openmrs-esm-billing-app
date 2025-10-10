import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  DataTable,
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
import { showSnackbar, openmrsFetch, restBaseUrl, showModal, getCoreTranslation } from '@openmrs/esm-framework';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import styles from './payment-modes-config.scss';

const PaymentModesConfig: React.FC = () => {
  const { t } = useTranslation();
  const [paymentModes, setPaymentModes] = useState([]);

  const fetchPaymentModes = useCallback(async () => {
    try {
      const response = await openmrsFetch(`${restBaseUrl}/billing/paymentMode?v=full`);
      setPaymentModes(response.data.results || []);
    } catch (err) {
      showSnackbar({
        title: getCoreTranslation('error'),
        subtitle: t('errorFetchingPaymentModes', 'An error occurred while fetching payment modes.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  }, [t]);

  useEffect(() => {
    fetchPaymentModes();
  }, [fetchPaymentModes]);

  const handleAddPaymentMode = () => {
    const dispose = showModal('add-payment-mode-modal', {
      onPaymentModeAdded: fetchPaymentModes,
      closeModal: () => dispose(),
    });
  };

  const handleDeletePaymentMode = (paymentMode) => {
    const dispose = showModal('delete-payment-mode-modal', {
      paymentModeUuid: paymentMode.uuid,
      paymentModeName: paymentMode.name,
      onPaymentModeDeleted: fetchPaymentModes,
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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <CardHeader title={t('paymentModeHistory', 'Payment Mode History')}>
          <Button renderIcon={Add} onClick={handleAddPaymentMode} kind="ghost">
            {t('addNewPaymentMode', 'Add New Payment Mode')}
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
