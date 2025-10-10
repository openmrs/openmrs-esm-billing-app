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
        quantity: z.string({ required_error: t('quantityRequired', 'Quantity is required') }),
        price: z.string({ required_error: t('priceIsRequired', 'Price is required') }),
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
      quantity: item.quantity.toString(),
      price: item.price.toString(),
    },
    resolver: zodResolver(schema),
  });

  const quantity = watch('quantity');
  const price = watch('price');

  useEffect(() => {
    const newTotal = parseInt(quantity) * parseInt(price);
    setTotal(newTotal);
  }, [quantity, price]);

  const onSubmit = async (data: BillLineItemForm) => {
    const url = `${apiBasePath}bill`;

    const newItem = {
      ...item,
      quantity: parseInt(data.quantity),
      price: parseInt(data?.price),
      billableService: getBillableServiceUuid(billableServices, item.billableService),
      item: item?.item,
    };

    const previousLineitems = bill?.lineItems
      .filter((currItem) => currItem.uuid !== item?.uuid)
      .map((currItem) => ({
        ...currItem,
        billableService: getBillableServiceUuid(billableServices, item.billableService),
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
        title: t('saveBill', 'Save Bill'),
        subtitle: t('billProcessingSuccess', 'Bill processing has been successful'),
        kind: 'success',
      });
      closeModal();
    } catch (error) {
      showSnackbar({
        title: t('billProcessingError', 'Bill processing error'),
        kind: 'error',
        subtitle: error?.message,
      });
    }
  };

  if (Object.keys(bill)?.length === 0) {
    return <ModalHeader closeModal={closeModal} title={t('billLineItemEmpty', 'This bill has no line items')} />;
  }

  return (
    <>
      <ModalHeader closeModal={closeModal} title={t('editBillLineItem', 'Edit bill line item?')} />
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
                {t('item', 'Item')} : {item?.billableService ? item?.billableService : item?.item}
              </p>
              <p className={styles.label}>
                {t('currentPrice', 'Current price')} : {item?.price}
              </p>
              <p className={styles.label}>
                {t('status', 'status')} : {item?.paymentStatus}
              </p>
              <Controller
                name="quantity"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <NumberInput
                    label={t('quantity', 'Quantity')}
                    id="quantityInput"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(_event: any, { value: newValue }: any) => onChange(String(newValue))}
                    className={styles.controlField}
                    invalid={errors.quantity?.message}
                    invalidText={errors.quantity?.message}
                  />
                )}
              />

              <Controller
                name="price"
                control={control}
                render={({ field: { value } }) => (
                  <TextInput
                    id="priceInput"
                    labelText={t('price', 'Unit Price')}
                    value={value}
                    readOnly={true}
                    className={styles.controlField}
                    helperText={t('unitPriceHelperText', 'This is the unit price for this item.')}
                  />
                )}
              />

              <p className={styles.label}>
                {t('total', 'Total')} : {total}{' '}
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
