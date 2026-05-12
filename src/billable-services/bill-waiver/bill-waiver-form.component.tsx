import React, { useState } from 'react';
import { Button, Form, FormGroup, Layer, NumberInput, Stack } from '@carbon/react';
import { TaskAdd } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { calculateTotalAmount, convertToCurrency } from '../../helpers';
import { updateBillItems } from '../../billing.resource';
import type { LineItem, MappedBill } from '../../types';
import type { BillingConfig } from '../../config-schema';
import styles from './bill-waiver-form.scss';

type BillWaiverFormProps = {
  bill: MappedBill;
  lineItems: Array<LineItem>;
  setPatientUuid: (patientUuid) => void;
};

const BillWaiverForm: React.FC<BillWaiverFormProps> = ({ bill, lineItems, setPatientUuid }) => {
  const { t } = useTranslation();
  const [waiverAmount, setWaiverAmount] = useState(0);
  const totalAmount = calculateTotalAmount(lineItems);
  const billTotal = bill.totalAmount ?? totalAmount;
  const { defaultCurrency, waiverPaymentModeUuid } = useConfig<BillingConfig>();

  if (lineItems?.length === 0) {
    return null;
  }

  const handleProcessPayment = async () => {
    if (!waiverPaymentModeUuid) {
      showSnackbar({
        title: t('billWaiverErrorTitle', 'Waiver Error'),
        subtitle: t('waiverServiceNotConfigured', 'Waiver service UUID is not configured.'),
        kind: 'error',
      });
      return;
    }

    try {
      // Add negative line item for waiver using updateBillItems
      const nextLineItemOrder = Math.max(...lineItems.map((item) => item.lineItemOrder ?? 0), 0) + 1;
      await updateBillItems({
        uuid: bill.uuid,
        cashPoint: bill.cashPointUuid,
        cashier: bill.cashier?.uuid ?? '',
        patient: bill.patientUuid,
        status: bill.status,
        lineItems: [
          ...lineItems.map((item) => ({
            uuid: item.uuid,
            item: item.item,
            quantity: item.quantity,
            price: item.price,
            paymentStatus: item.paymentStatus,
            lineItemOrder: item.lineItemOrder,
          })),
          {
            item: waiverPaymentModeUuid,
            quantity: 1,
            price: -Math.abs(Number(waiverAmount) || 0),
            paymentStatus: 'PENDING',
            lineItemOrder: nextLineItemOrder,
          },
        ],
      });

      showSnackbar({
        title: t('billWaiver', 'Bill waiver'),
        subtitle: t('billWaiverSuccess', 'Bill waiver successful'),
        kind: 'success',
        isLowContrast: true,
      });
      setPatientUuid('');
    } catch (error) {
      showSnackbar({
        title: t('billWaiver', 'Bill waiver'),
        subtitle: t('billWaiverError', 'An error occurred'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  return (
    <Form className={styles.billWaiverForm} aria-label={t('waiverForm', 'Waiver form')}>
      <hr />
      <Stack gap={7}>
        <FormGroup legendText="">
          <section className={styles.billWaiverDescription}>
            <label className={styles.label}>{t('billItems', 'Bill Items')}</label>
            <p className={styles.value}>
              {t('billName', '{{billName}}', {
                billName: lineItems.map((item) => item.item || item.billableService).join(', ') ?? '--',
              })}
            </p>
          </section>
          <section className={styles.billWaiverDescription}>
            <label className={styles.label}>{t('billTotal', 'Bill total')}</label>
            <p className={styles.value}>{convertToCurrency(billTotal, defaultCurrency)}</p>
          </section>

          <Layer className={styles.formControlLayer}>
            <NumberInput
              id="waiver-amount"
              allowEmpty
              aria-label={t('amountToWaiveAriaLabel', 'Enter amount to waive')}
              disableWheel
              helperText={t('amountToWaiveHelper', 'Specify the amount to be deducted from the bill')}
              hideSteppers
              invalidText={t('invalidWaiverAmount', 'Invalid waiver amount')}
              label={t('amountToWaiveLabel', 'Amount to waive')}
              max={billTotal}
              min={0}
              onChange={(_, { value }) => setWaiverAmount(Number(value) || 0)}
              value={waiverAmount}
            />
          </Layer>
        </FormGroup>
        <div className={styles.buttonContainer}>
          <Button kind="tertiary" renderIcon={TaskAdd} onClick={handleProcessPayment}>
            {t('postWaiver', 'Post waiver')}
          </Button>
        </div>
      </Stack>
    </Form>
  );
};

export default BillWaiverForm;
