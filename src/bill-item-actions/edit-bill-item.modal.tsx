import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Column,
  Form,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NumberInput,
  Stack,
  TextInput,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';
import { mutate } from 'swr';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCoreTranslation, showSnackbar } from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';
import { getBillableServiceUuid } from '../invoice/payments/utils';
import { type LineItem, type MappedBill } from '../types';
import { updateBillItems } from '../billing.resource';
import { useBillableServices } from '../billable-services/billable-service.resource';
import styles from './bill-item-actions.scss';

interface EditBillLineItemModalProps {
  bill: MappedBill;
  closeModal: () => void;
  item: LineItem;
}

const EditBillLineItemModal: React.FC<EditBillLineItemModalProps> = ({ bill, closeModal, item }) => {
  const { t } = useTranslation();
  const { billableServices } = useBillableServices();
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [total, setTotal] = useState(0);

  const schema = useMemo(
    () =>
      z.object({
        // NOTE: Frontend-only validation - quantities <1 or >100 can still be submitted via API.
        // Backend (BillServiceImpl.java:100) has empty validate() method.
        // TODO: Add server-side validation to enforce data integrity
        quantity: z.coerce
          .number({
            required_error: t('quantityRequired', 'Quantity is required'),
            invalid_type_error: t('quantityMustBeNumber', 'Quantity must be a valid number'),
          })
          .int(t('quantityMustBeInteger', 'Quantity must be a whole number'))
          .min(1, t('quantityMustBeAtLeastOne', 'Quantity must be at least 1'))
          .max(100, t('quantityCannotExceed100', 'Quantity cannot exceed 100')),
        price: z.coerce
          .number({
            required_error: t('priceIsRequired', 'Price is required'),
            invalid_type_error: t('priceMustBeNumber', 'Price must be a valid number'),
          })
          .positive(t('priceMustBePositive', 'Price must be greater than 0')),
      }),
    [t],
  );

  type BillLineItemForm = z.infer<typeof schema>;

  const onError = (errors: FieldErrors<LineItem>) => {
    if (errors) {
      setShowErrorNotification(true);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<BillLineItemForm>({
    defaultValues: {
      quantity: item.quantity,
      price: item.price,
    },
    resolver: zodResolver(schema),
  });

  const quantity = watch('quantity');
  const price = watch('price');

  useEffect(() => {
    const quantityNum = typeof quantity === 'number' ? quantity : parseFloat(quantity) || 0;
    const priceNum = typeof price === 'number' ? price : parseFloat(price) || 0;
    const newTotal = quantityNum * priceNum;
    setTotal(isNaN(newTotal) ? 0 : newTotal);
  }, [quantity, price]);

  const onSubmit = async (data: BillLineItemForm) => {
    const url = `${apiBasePath}bill`;

    const newItem = {
      ...item,
      quantity: data.quantity,
      price: data.price,
      billableService: getBillableServiceUuid(billableServices, item.billableService),
      item: item?.item,
    };

    const previousLineitems = bill?.lineItems
      .filter((currItem) => currItem.uuid !== item?.uuid)
      .map((currItem) => ({
        ...currItem,
        billableService: getBillableServiceUuid(billableServices, currItem.billableService),
      }));

    const updatedLineItems = previousLineitems.concat(newItem);

    const payload = {
      cashPoint: bill.cashPointUuid,
      cashier: bill.cashier.uuid,
      lineItems: updatedLineItems,
      patient: bill.patientUuid,
      status: bill.status,
      uuid: bill.uuid,
    };

    try {
      await updateBillItems(payload);
      mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
      showSnackbar({
        title: t('lineItemUpdated', 'Line item updated'),
        subtitle: t('lineItemUpdateSuccess', 'The bill line item has been updated successfully'),
        kind: 'success',
      });
      closeModal();
    } catch (error) {
      showSnackbar({
        title: t('lineItemUpdateFailed', 'Failed to update line item'),
        subtitle:
          error?.message || t('lineItemUpdateErrorDefault', 'Unable to update the bill line item. Please try again.'),
        kind: 'error',
      });
    }
  };

  if (Object.keys(bill)?.length === 0) {
    return <ModalHeader closeModal={closeModal} title={t('billLineItemEmpty', 'This bill has no line items')} />;
  }

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('editBillLineItem', 'Edit bill line item')} />
      <Form onSubmit={handleSubmit(onSubmit, onError)}>
        <ModalBody>
          <Stack gap={5}>
            <div className={styles.modalBody}>
              <h5>
                {bill?.patientName} &nbsp; · &nbsp;{bill?.cashPointName} &nbsp; · &nbsp;{bill?.receiptNumber}&nbsp;
              </h5>
            </div>
            <section>
              <p className={styles.label}>
                {t('item', 'Item')}: {item?.billableService ? item?.billableService : item?.item}
              </p>
              <p className={styles.label}>
                {t('currentPrice', 'Current price')}: {item?.price}
              </p>
              <p className={styles.label}>
                {t('status', 'status')}: {item?.paymentStatus}
              </p>
              <Controller
                name="quantity"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <NumberInput
                    disableWheel
                    className={styles.controlField}
                    hideSteppers
                    id="quantityInput"
                    invalid={!!errors.quantity}
                    invalidText={errors.quantity?.message}
                    label={t('quantity', 'Quantity')}
                    onChange={(_event, state: { value: number | string; direction: string }) => {
                      onChange(state.value);
                    }}
                    value={value}
                  />
                )}
              />

              <Controller
                name="price"
                control={control}
                render={({ field: { value } }) => (
                  <TextInput
                    className={styles.controlField}
                    helperText={t('unitPriceHelperText', 'This is the unit price for this item.')}
                    id="priceInput"
                    labelText={t('price', 'Unit Price')}
                    readOnly
                    value={value}
                  />
                )}
              />

              <p className={styles.label}>
                {t('total', 'Total')}: {total}{' '}
              </p>

              {showErrorNotification && (
                <Column className={styles.errorContainer}>
                  <InlineNotification
                    lowContrast
                    title={t('error', 'Error')}
                    subtitle={t('pleaseRequiredFields', 'Please fill all required fields') + '.'}
                    onClose={() => setShowErrorNotification(false)}
                  />
                </Column>
              )}
            </section>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className={styles.inline}>
                <InlineLoading
                  status="active"
                  iconDescription={t('submitting', 'Submitting')}
                  description={t('submitting', 'Submitting') + '...'}
                />
              </div>
            ) : (
              getCoreTranslation('save')
            )}
          </Button>
        </ModalFooter>
      </Form>
    </>
  );
};

export default EditBillLineItemModal;
