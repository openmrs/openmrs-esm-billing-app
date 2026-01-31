import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Dropdown, NumberInput, NumberInputSkeleton, TextInput } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-framework';
import { type PaymentFormValue } from '../payments.component';
import { usePaymentModes } from '../payment.resource';
import styles from './payment-form.scss';

type PaymentFormProps = {
  disablePayment: boolean;
};

const PaymentForm: React.FC<PaymentFormProps> = ({ disablePayment }) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PaymentFormValue>();
  const { paymentModes, isLoading, error } = usePaymentModes();

  if (isLoading) {
    return <NumberInputSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.errorPaymentContainer}>
        <ErrorState headerTitle={t('errorLoadingPaymentModes', 'Error loading payment modes')} error={error} />
      </div>
    );
  }

  if (disablePayment) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.paymentMethodContainer}>
        <Controller
          control={control}
          name="payment.method"
          render={({ field }) => (
            <Dropdown
              id="paymentMethod"
              selectedItem={paymentModes?.find((m) => m.uuid === field.value) ?? null}
              onChange={({ selectedItem }) => field.onChange(selectedItem?.uuid ?? '')}
              titleText={t('paymentMethod', 'Payment method')}
              label={t('selectPaymentMethod', 'Select payment method')}
              items={paymentModes}
              itemToString={(item) => (item ? item.name : '')}
              invalid={!!errors?.payment?.method}
              invalidText={errors?.payment?.method?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="payment.amount"
          render={({ field }) => (
            <NumberInput
              allowEmpty
              disableWheel
              hideSteppers
              id="paymentAmount"
              invalid={!!errors?.payment?.amount}
              invalidText={errors?.payment?.amount?.message}
              label={t('amount', 'Amount')}
              onChange={(_, { value }) => {
                const numValue = value === '' || value === undefined ? undefined : Number(value);
                field.onChange(numValue);
              }}
              placeholder={t('enterAmount', 'Enter amount')}
              value={field.value ?? ''}
            />
          )}
        />
        <Controller
          name="payment.referenceCode"
          control={control}
          render={({ field }) => (
            <TextInput
              id="paymentReferenceCode"
              labelText={t('referenceNumber', 'Reference number')}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              placeholder={t('enterReferenceNumber', 'Enter reference number')}
              type="text"
              value={field.value ?? ''}
            />
          )}
        />
      </div>
    </div>
  );
};

export default PaymentForm;
