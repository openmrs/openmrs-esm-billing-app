import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  DataTable,
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
import {
  CardHeader,
  getCoreTranslation,
  openmrsFetch,
  restBaseUrl,
  showModal,
  showSnackbar,
} from '@openmrs/esm-framework';
import styles from './cash-point-configuration.scss';

const CashPointConfiguration: React.FC = () => {
  const { t } = useTranslation();
  const [cashPoints, setCashPoints] = useState([]);

  const fetchCashPoints = useCallback(async () => {
    try {
      const response = await openmrsFetch(`${restBaseUrl}/billing/cashPoint?v=full`);
      setCashPoints(response.data.results || []);
    } catch (err) {
      showSnackbar({
        title: getCoreTranslation('error'),
        subtitle: t('errorFetchingCashPoints', 'An error occurred while fetching cash points.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  }, [t]);

  useEffect(() => {
    fetchCashPoints();
  }, [fetchCashPoints]);

  const handleAddCashPoint = () => {
    const dispose = showModal('add-cash-point-modal', {
      onCashPointAdded: fetchCashPoints,
      closeModal: () => dispose(),
    });
  };

  const rowData = cashPoints.map((point) => ({
    id: point.uuid,
    name: point.name,
    uuid: point.uuid,
    location: point.location ? point.location.display : 'None',
  }));

  const headerData = [
    { key: 'name', header: t('name', 'Name') },
    { key: 'uuid', header: t('uuid', 'UUID') },
    { key: 'location', header: t('location', 'Location') },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <CardHeader title={t('cashPointHistory', 'Cash point history')}>
          <Button renderIcon={Add} onClick={handleAddCashPoint} kind="ghost">
            {t('addNewCashPoint', 'Add new cash point')}
          </Button>
        </CardHeader>
        <div>
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
      </div>
    </div>
  );
};

export default CashPointConfiguration;
