import React, { useEffect, useMemo, useState } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader, Form, InlineLoading } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar } from '@openmrs/esm-framework';
import { Controller, type FieldErrors, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LineItem, type MappedBill } from '../types';
import styles from './bill-item-actions.scss';
import { updateBillItems } from '../billing.resource';
import { mutate } from 'swr';
import { apiBasePath } from '../constants';
import { Column } from '@carbon/react';
import { InlineNotification } from '@carbon/react';
import { getBillableServiceUuid } from '../invoice/payments/utils';
import { useBillableServices } from '../billable-services/billable-service.resource';
import { NumberInput } from '@carbon/react';
import { TextInput } from '@carbon/react';

interface BillLineItemProps {
  bill: MappedBill;
  item: LineItem;
  closeModal: () => void;
}

const ChangeStatus: React.FC<BillLineItemProps> = ({ bill, item, closeModal }) => {
  const { t } = useTranslation();
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [total, setTotal] = useState(0);
  const { billableServices } = useBillableServices();

  const schema = useMemo(
    () =>
      z.object({
        quantity: z.string({ required_error: t('quantityRequired', 'Quantity is required') }),
        price: z.string({ required_error: t('priceIsRequired', 'Price is required') }),
      }),
    [],
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
    formState: { isSubmitting, errors, isDirty },
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

  const onSubmit = (data: BillLineItemForm) => {
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
    updateBillItems(payload).then(
      (res) => {
        mutate((key) => typeof key === 'string' && key.startsWith(url), undefined, { revalidate: true });
        showSnackbar({
          title: t('billItems', 'Save Bill'),
          subtitle: 'Bill processing has been successful',
          kind: 'success',
          timeoutInMs: 3000,
        });
        closeModal();
      },
      (error) => {
        showSnackbar({ title: 'Bill processing error', kind: 'error', subtitle: error?.message });
      },
    );
  };

  if (Object.keys(bill)?.length === 0) {
    return <ModalHeader closeModal={closeModal} title={t('billLineItemEmpty', 'This bill has no line items')} />;
  }

  if (Object.keys(bill)?.length > 0) {
    return (
      <div>
        <Form onSubmit={handleSubmit(onSubmit, onError)}>
          <ModalHeader closeModal={closeModal} title={t('editBillLineItem', 'Edit bill line item?')} />
          <ModalBody>
            <div className={styles.modalBody}>
              <h5>
                {bill?.patientName} &nbsp; · &nbsp;{bill?.cashPointName} &nbsp; · &nbsp;{bill?.receiptNumber}&nbsp;
              </h5>
            </div>
            <section className={styles.section}>
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
                render={({ field: { onChange, onBlur, value } }) => (
                  <NumberInput
                    label={t('quantity', 'Quantity')}
                    id="quantityInput"
                    min={0}
                    max={100}
                    value={value}
                    onChange={onChange}
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
                    helperText="This is the unit Price for this item."
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
          </ModalBody>
          <ModalFooter>
            <Button kind="secondary" onClick={closeModal}>
              {t('cancel', 'Cancel')}
            </Button>
            <Button disabled={isSubmitting} type="submit">
              <>
                {isSubmitting ? (
                  <div className={styles.inline}>
                    <InlineLoading
                      status="active"
                      iconDescription={t('submitting', 'Submitting')}
                      description={t('submitting', 'Submitting...')}
                    />
                  </div>
                ) : (
                  t('save', 'Save')
                )}
              </>
            </Button>
          </ModalFooter>
        </Form>
      </div>
    );
  }
};

export default ChangeStatus;
