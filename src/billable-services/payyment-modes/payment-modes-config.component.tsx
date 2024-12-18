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
} from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { showSnackbar, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import styles from './payment-modes-config.scss';

// Validation schema
const paymentModeSchema = z.object({
  name: z.string().min(1, 'Payment Mode Name is required'),
  description: z.string().optional(),
});

type PaymentModeFormValues = z.infer<typeof paymentModeSchema>;

const PaymentModesConfig: React.FC = () => {
  const { t } = useTranslation();
  const [paymentModes, setPaymentModes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentModeFormValues>({
    resolver: zodResolver(paymentModeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const fetchPaymentModes = useCallback(async () => {
    try {
      const response = await openmrsFetch(`${restBaseUrl}/billing/paymentMode?v=full`);
      setPaymentModes(response.data.results || []);
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorFetchingPaymentModes', 'An error occurred while fetching payment modes.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  }, [t]);

  useEffect(() => {
    fetchPaymentModes();
  }, [fetchPaymentModes]);

  const onSubmit = async (data: PaymentModeFormValues) => {
    // Check for duplicate payment mode name
    const isDuplicate = paymentModes.some((mode) => mode.name.toLowerCase() === data.name.toLowerCase());

    if (isDuplicate) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t(
          'duplicatePaymentModeError',
          'A payment mode with the same name already exists. Please create another payment mode',
        ),
        kind: 'error',
        isLowContrast: false,
      });
      return;
    }

    try {
      const response = await openmrsFetch(`${restBaseUrl}/billing/paymentMode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
        }),
      });

      if (response.ok) {
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('paymentModeSaved', 'Payment mode was successfully saved.'),
          kind: 'success',
        });

        setIsModalOpen(false);
        reset({ name: '', description: '' });
        fetchPaymentModes();
      } else {
        const errorData = response.data || {};
        showSnackbar({
          title: t('error', 'Error'),
          subtitle:
            errorData.message || t('errorSavingPaymentMode', 'An error occurred while saving the payment mode.'),
          kind: 'error',
          isLowContrast: false,
        });
      }
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorSavingPaymentMode', 'An error occurred while saving the payment mode.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedPaymentMode) return;

    try {
      await openmrsFetch(`${restBaseUrl}/billing/paymentMode/${selectedPaymentMode.uuid}`, {
        method: 'DELETE',
      });

      showSnackbar({
        title: t('success', 'Success'),
        subtitle: t('paymentModeDeleted', 'Payment mode was successfully deleted.'),
        kind: 'success',
      });

      setIsDeleteModalOpen(false);
      setSelectedPaymentMode(null);
      fetchPaymentModes();
    } catch (err) {
      showSnackbar({
        title: t('error', 'Error'),
        subtitle: t('errorDeletingPaymentMode', 'An error occurred while deleting the payment mode.'),
        kind: 'error',
        isLowContrast: false,
      });
    }
  };

  const rowData = paymentModes.map((mode) => ({
    id: mode.uuid,
    name: mode.name,
    description: mode.description || '--',
  }));

  const headerData = [
    { key: 'name', header: t('name', 'Name') },
    { key: 'description', header: t('description', 'Description') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <CardHeader title={t('paymentModeHistory', 'Payment Mode History')}>
          <Button renderIcon={Add} onClick={() => setIsModalOpen(true)} kind="ghost">
            {t('addPaymentMode', 'Add New Payment Mode')}
          </Button>
        </CardHeader>
        <div className={styles.historyContainer}>
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
                                  itemText={t('delete', 'Delete')}
                                  onClick={() => {
                                    const selected = paymentModes.find((p) => p.uuid === row.id);
                                    setSelectedPaymentMode(selected);
                                    setIsDeleteModalOpen(true);
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

      {/* Modal for Adding New Payment Mode */}
      <Modal
        open={isModalOpen}
        modalHeading={t('addPaymentMode', 'Add Payment Mode')}
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
                id="payment-mode-name"
                labelText={t('paymentModeName', 'Payment Mode Name')}
                placeholder={t('paymentModeNamePlaceholder', 'e.g., Cash, Credit Card')}
                invalid={!!errors.name}
                invalidText={errors.name?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextInput
                id="payment-mode-description"
                labelText={t('description', 'Description')}
                placeholder={t('descriptionPlaceholder', 'e.g., Used for all cash transactions')}
                invalid={!!errors.description}
                invalidText={errors.description?.message}
                {...field}
              />
            )}
          />
        </form>
      </Modal>

      {/* Modal for Deleting Payment Mode */}
      <Modal
        open={isDeleteModalOpen}
        modalHeading={t('deletePaymentMode', 'Delete Payment Mode')}
        onRequestClose={() => setIsDeleteModalOpen(false)}
        onRequestSubmit={handleDelete}
        primaryButtonText={t('delete', 'Delete')}
        secondaryButtonText={t('cancel', 'Cancel')}
        primaryButtonDanger
        danger>
        <p>{t('confirmDeleteMessage', 'Are you sure you want to delete this payment mode? Proceed cautiously.')}</p>
      </Modal>
    </div>
  );
};

export default PaymentModesConfig;
