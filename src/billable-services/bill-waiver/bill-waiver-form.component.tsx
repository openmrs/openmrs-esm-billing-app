import React, { useState } from 'react';
import { Button, Form, FormGroup, Layer, NumberInput, Stack } from '@carbon/react';
import { TaskAdd } from '@carbon/react/icons';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { calculateTotalAmount, convertToCurrency } from '../../helpers';
import { processBillPayment } from '../../billing.resource';
import type { LineItem, MappedBill } from '../../types';
import type { BillingConfig } from '../../config-schema';
import { apiBasePath } from '../../constants';
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
  const { mutate } = useSWRConfig();

  if (lineItems?.length === 0) {
    return null;
  }

  const handleProcessPayment = async () => {
    try {
      await processBillPayment(
        {
          instanceType: waiverPaymentModeUuid,
          amount: billTotal,
          amountTendered: Number(waiverAmount) || 0,
        },
        bill.uuid,
      );
      showSnackbar({
        title: t('billWaiver', 'Bill waiver'),
        subtitle: t('billWaiverSuccess', 'Bill waiver successful'),
        kind: 'success',
        isLowContrast: true,
      });
      setPatientUuid('');
      mutate((key) => typeof key === 'string' && key.startsWith(`${apiBasePath}bill?v=full`), undefined, {
        revalidate: true,
      });
    } catch (error) {
      showSnackbar({
        title: t('billWaiver', 'Bill waiver'),
        subtitle: t('billWaiverError', 'Bill waiver failed {{error}}', { error: error?.message }),
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
