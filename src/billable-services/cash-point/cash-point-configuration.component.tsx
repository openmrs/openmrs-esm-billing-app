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
import {
  showSnackbar,
  openmrsFetch,
  restBaseUrl,
  showModal,
  getCoreTranslation,
  isDesktop,
  useLayoutType,
} from '@openmrs/esm-framework';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import styles from './cash-point-configuration.scss';
import { type CashPoint } from '../../types/index';

const CashPointConfiguration: React.FC = () => {
  const { t } = useTranslation();
  const [cashPoints, setCashPoints] = useState([]);
  const layout = useLayoutType();

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

  const handleEditCashPoint = (point: CashPoint) => {
    const dispose = showModal('add-cash-point-modal', {
      cashPointToEdit: point,
      onCashPointAdded: fetchCashPoints,
      closeModal: () => dispose(),
    });
  };

  const rowData = cashPoints.map((point: CashPoint) => ({
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
          <DataTable rows={rowData} headers={headerData} isSortable size="lg" overflowMenuOnHover={isDesktop(layout)}>
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
                      <TableHeader aria-label={getCoreTranslation('actions')} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} {...getRowProps({ row })}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                        <TableCell className="cds--table-column-menu">
                          <OverflowMenu size="lg" flipped>
                            <OverflowMenuItem
                              className={styles.menuItem}
                              itemText={t('editCashPoint', 'Edit cash point')}
                              onClick={() => handleEditCashPoint(cashPoints.find((point) => point.uuid === row.id))}
                            />
                          </OverflowMenu>
                        </TableCell>
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
