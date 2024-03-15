import React from 'react';
import { Form, Stack, FormGroup, Layer, Button, NumberInput } from '@carbon/react';
import { TaskAdd } from '@carbon/react/icons';
import { mutate } from 'swr';
import { useTranslation } from 'react-i18next';
import { restBaseUrl, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { createBillWaiverPayload } from './utils';
import { convertToCurrency } from '../../helpers';
import { processBillPayment } from '../../billing.resource';
import { useBillableItems } from '../../billing-form/billing-form.resource';
import type { LineItem, MappedBill } from '../../types';
import styles from './bill-waiver-form.scss';
import { apiBasePath } from '../../constants';

type BillWaiverFormProps = {
  bill: MappedBill;
  lineItems: Array<LineItem>;
  setPatientUuid: (patientUuid) => void;
};

const BillWaiverForm: React.FC<BillWaiverFormProps> = ({ bill, lineItems, setPatientUuid }) => {
  const { t } = useTranslation();
  const [waiverAmount, setWaiverAmount] = React.useState(0);
  const { lineItems: billableLineItems, isLoading: isLoadingLineItems, error: lineError } = useBillableItems();
  const totalAmount = lineItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const { defaultCurrency } = useConfig();

  if (lineItems?.length === 0) {
    return null;
  }

  const handleProcessPayment = (event) => {
    const waiverEndPointPayload = createBillWaiverPayload(
      bill,
      waiverAmount,
      totalAmount,
      lineItems,
      billableLineItems,
    );

    processBillPayment(waiverEndPointPayload, bill.uuid).then(
      (resp) => {
        showSnackbar({
          title: t('billWaiver', 'Bill waiver'),
          subtitle: t('billWaiverSuccess', 'Bill waiver successful'),
          kind: 'success',
          timeoutInMs: 3500,
          isLowContrast: true,
        });
        setPatientUuid('');
        mutate((key) => typeof key === 'string' && key.startsWith(`${apiBasePath}bill?v=full`), undefined, {
          revalidate: true,
        });
      },
      (err) => {
        showSnackbar({
          title: t('billWaiver', 'Bill waiver'),
          subtitle: t('billWaiverError', 'Bill waiver failed {{error}}', { error: err.message }),
          kind: 'error',
          timeoutInMs: 3500,
          isLowContrast: true,
        });
      },
    );
  };

  return (
    <Form className={styles.billWaiverForm} aria-label={t('waiverForm', 'Waiver form')}>
      <hr />
      <Stack gap={7}>
        <FormGroup>
          <section className={styles.billWaiverDescription}>
            <label className={styles.label}>{t('billItems', 'Bill Items')}</label>
            <p className={styles.value}>
              {t('billName', ' {{billName}} ', {
                billName: lineItems.map((item) => item.item || item.billableService).join(', ') ?? '--',
              })}
            </p>
          </section>
          <section className={styles.billWaiverDescription}>
            <label className={styles.label}>{t('billTotal', 'Bill total')}</label>
            <p className={styles.value}>{convertToCurrency(totalAmount, defaultCurrency)}</p>
          </section>

          <Layer className={styles.formControlLayer}>
            <NumberInput
              label={t('amountToWaiveLabel', 'Amount to Waive')}
              helperText={t('amountToWaiveHelper', 'Specify the amount to be deducted from the bill')}
              aria-label={t('amountToWaiveAriaLabel', 'Enter amount to waive')}
              hideSteppers
              disableWheel
              min={0}
              max={totalAmount}
              invalidText={t('invalidWaiverAmount', 'Invalid waiver amount')}
              value={waiverAmount}
              onChange={(event) => setWaiverAmount(event.target.value)}
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
