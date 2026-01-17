import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react';
import { ProposedBillItem } from './types';
import { convertToCurrency } from '../helpers/functions';
import { useConfig } from '@openmrs/esm-framework';
import { BillingConfig } from '../config-schema';

interface BillPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  proposedItems: ProposedBillItem[];
  onConfirm: (selectedItems: ProposedBillItem[]) => void;
}

const BillPreview: React.FC<BillPreviewProps> = ({ isOpen, onClose, proposedItems, onConfirm }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig<BillingConfig>();
  const [selectedRows, setSelectedRows] = useState<ProposedBillItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedRows(proposedItems);
    }
  }, [isOpen, proposedItems]);

  const headers = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'event', header: t('clinicalEvent', 'Clinical Event') },
    { key: 'service', header: t('billableService', 'Billable Service') },
    { key: 'price', header: t('price', 'Price') },
  ];

  const rows = proposedItems.map((item, index) => ({
    id: String(index),
    date: item.event.date.toLocaleDateString(),
    event: `${item.event.type} - ${item.event.conceptName}`,
    service: item.matchedBillableItem.name,
    price: convertToCurrency(
      typeof item.matchedBillableItem.servicePrices?.[0]?.price === 'number'
        ? item.matchedBillableItem.servicePrices?.[0]?.price
        : parseFloat(item.matchedBillableItem.servicePrices?.[0]?.price || '0'),
      defaultCurrency,
    ),
    originalItem: item,
  }));

  const handleCreateBill = () => {
    onConfirm(selectedRows);
    onClose();
  };

  const handleSelectRow = (selectedRowIds: string[]) => {
    const selected = rows.filter((row) => selectedRowIds.includes(row.id)).map((row) => row.originalItem);
    setSelectedRows(selected);
  };

  return (
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      modalHeading={t('unbilledEventsDetected', 'Unbilled Clinical Events Detected')}
      primaryButtonText={t('addToBill', 'Add to Bill')}
      secondaryButtonText={t('cancel', 'Cancel')}
      onSecondarySubmit={onClose}
      onRequestSubmit={handleCreateBill}
      size="lg">
      <p style={{ marginBottom: '1rem' }}>
        {t(
          'autoBillDescription',
          'The following clinical events were found but have not been billed yet. Select the items you want to add to this bill.',
        )}
      </p>

      <DataTable rows={rows} headers={headers} isSortable>
        {({ rows, headers, getHeaderProps, getRowProps, getSelectionProps, getTableProps, getToolbarProps }) => (
          <TableContainer>
            <TableToolbar>
              <TableToolbarContent>
                <TableToolbarSearch {...getToolbarProps()} />
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableSelectRow
                    {...getSelectionProps({
                      onClick: (e) => {
                        getSelectionProps().onClick(e);
                      },
                    })}
                  />
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {header.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow {...getRowProps({ row })} key={row.id}>
                    <TableSelectRow
                      {...getSelectionProps({
                        row,
                        onClick: (e) => {
                          const isSelected = selectedRows.some((r) => r === row.originalItem);
                          if (isSelected) {
                            setSelectedRows(selectedRows.filter((r) => r !== row.originalItem));
                          } else {
                            setSelectedRows([...selectedRows, row.originalItem]);
                          }

                          getSelectionProps({ row }).onClick(e);
                        },
                      })}
                      checked={selectedRows.some((r) => r === row.originalItem)}
                    />
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
    </Modal>
  );
};

export default BillPreview;
