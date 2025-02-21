import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Modal,
  TextInput,
  OverflowMenu,
  OverflowMenuItem,
  Dropdown,
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { showSnackbar, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import styles from './cash-point-configuration.scss';

// Validation schema
const cashPointSchema = z.object({
  name: z.string().min(1, 'Cash Point Name is required'),
  uuid: z
    .string()
    .min(1, 'UUID is required')
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Invalid UUID format'),
  location: z.string().min(1, 'Location is required'),
});

type CashPointFormValues = z.infer<typeof cashPointSchema>;

const CashPointConfiguration: React.FC = () => {
  const { t } = useTranslation();
  const [cashPoints, setCashPoints] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CashPointFormValues>({
    resolver: zodResolver(cashPointSchema),
    defaultValues: {
      name: '',
      uuid: '',
      location: '',
    },
  });

  const fetchCashPoints = useCallback(async () => {
    try {
      const response = await openmrsFetch(`${restBaseUrl}/billing/cashPoint?v=full`);
      setCashPoints(response.data.results || []);
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorFetchingCashPoints', 'An error occurred while fetching cash points.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  }, [t]);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await openmrsFetch(`${restBaseUrl}/location?v=default`);
      const allLocations = response.data.results.map((loc) => ({
        id: loc.uuid,
        label: loc.display,
      }));
      setLocations(allLocations);
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorFetchingLocations', 'An error occurred while fetching locations.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  }, [t]);

  useEffect(() => {
    fetchCashPoints();
    fetchLocations();
  }, [fetchCashPoints, fetchLocations]);

  const onSubmit = async (data: CashPointFormValues) => {
    const isDuplicate = cashPoints.some(
      (point) => point.name.toLowerCase() === data.name.toLowerCase() || point.uuid === data.uuid,
    );

    if (isDuplicate) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t(
          'duplicateCashPointError',
          'A cash point with the same name or UUID already exists. Please use a unique name and UUID.',
        ),
        kind: 'error',
        isLowContrast: false,
      });
      return;
    }

    try {
      const response = await openmrsFetch(`${restBaseUrl}/billing/cashPoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          name: data.name,
          uuid: data.uuid,
          location: { uuid: data.location },
        },
      });

      if (response.ok) {
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('cashPointSaved', 'Cash point was successfully saved.'),
          kind: 'success',
        });

        setIsModalOpen(false);
        reset({ name: '', uuid: '', location: '' });
        fetchCashPoints();
      } else {
        const errorData = response.data || {};
        showSnackbar({
          title: t('error', 'Error'),
          subtitle: errorData.message || t('errorSavingCashPoint', 'An error occurred while saving the cash point.'),
          kind: 'error',
          isLowContrast: false,
        });
      }
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorSavingCashPoint', 'An error occurred while saving the cash point.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
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
    { key: 'actions', header: t('actions', 'Actions') },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <CardHeader title={t('cashPointHistory', 'Cash Point History')}>
          <Button renderIcon={Add} onClick={() => setIsModalOpen(true)} kind="ghost">
            {t('addCashPoint', 'Add New Cash Point')}
          </Button>
        </CardHeader>
        <div className={styles.billHistoryContainer}>
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
                                <OverflowMenuItem itemText={t('delete', 'Delete')} disabled />
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

      {/* Modal for Adding New Cash Point */}
      <Modal
        open={isModalOpen}
        modalHeading={t('addCashPoint', 'Add Cash Point')}
        onRequestClose={() => setIsModalOpen(false)}
        onRequestSubmit={handleSubmit(onSubmit)}
        primaryButtonText={t('save', 'Save')}
        secondaryButtonText={t('cancel', 'Cancel')}
        isPrimaryButtonDisabled={isSubmitting}>
        <form>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextInput
                id="cash-point-name"
                labelText={t('cashPointName', 'Cash Point Name')}
                placeholder={t('cashPointNamePlaceholder', 'e.g., Pharmacy Cash Point')}
                invalid={!!errors.name}
                invalidText={errors.name?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="uuid"
            control={control}
            render={({ field }) => (
              <TextInput
                id="cash-point-uuid"
                labelText={t('cashPointUuid', 'Cash Point UUID')}
                placeholder={t('cashPointUuidPlaceholderText', 'e.g., 1ce1b7d4-c865-4178-82b0-5932e51503d6')}
                invalid={!!errors.uuid}
                invalidText={errors.uuid?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <Dropdown
                id="cash-point-location"
                label={t('location', 'Select Location')}
                titleText={t('cashPointLocation', 'Cash Point Location')}
                items={locations}
                selectedItem={locations.find((loc) => loc.id === field.value)}
                onChange={({ selectedItem }) => field.onChange(selectedItem?.id)}
                invalid={!!errors.location}
                invalidText={errors.location?.message}
              />
            )}
          />
        </form>
      </Modal>
    </div>
  );
};

export default CashPointConfiguration;
