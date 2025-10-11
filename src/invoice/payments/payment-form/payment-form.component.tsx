import React, { useCallback, useState, useEffect } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TrashCan, Add } from '@carbon/react/icons';
import { Button, IconButton, Dropdown, NumberInputSkeleton, TextInput, NumberInput } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { type PaymentFormValue } from '../payments.component';
import { usePaymentModes } from '../payment.resource';
import styles from './payment-form.scss';

type PaymentFormProps = {
  disablePayment: boolean;
  isSingleLineItem: boolean;
};

const DEFAULT_PAYMENT = { method: '', amount: undefined, referenceCode: '' };

const PaymentForm: React.FC<PaymentFormProps> = ({ disablePayment, isSingleLineItem }) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PaymentFormValue>();
  const { paymentModes, isLoading, error } = usePaymentModes();
  const { fields, remove, append } = useFieldArray({ name: 'payment', control });
  const [isFormVisible, setIsFormVisible] = useState(isSingleLineItem);

  useEffect(() => {
    if (isSingleLineItem && !disablePayment) {
      setIsFormVisible(true);
      if (fields.length === 0) {
        append(DEFAULT_PAYMENT);
      }
    }
  }, [isSingleLineItem, append, fields.length, disablePayment]);

  useEffect(() => {
    if (disablePayment) {
      setIsFormVisible(false);
      remove();
    }
  }, [disablePayment]);


  const handleAppendPaymentMode = useCallback(() => {
    setIsFormVisible(true);
    append(DEFAULT_PAYMENT);
  }, [append]);

  const handleRemovePaymentMode = useCallback((index: number) => remove(index), [remove]);

  if (isLoading) {
    return <NumberInputSkeleton />;
  }

  if (error) {
    return (
      <div className={styles.errorPaymentContainer}>
        <ErrorState headerTitle={t('errorLoadingPaymentModes', 'Payment modes error')} error={error} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {isFormVisible &&
        fields.map((fieldItem, index) => (
          <div key={fieldItem.id} className={styles.paymentMethodContainer}>
            <Controller
              control={control}
              name={`payment.${index}.method`}
              render={({ field }) => (
                <Dropdown
                  id="paymentMethod"
                  onChange={({ selectedItem }) => field.onChange(selectedItem?.uuid)}
                  titleText={t('paymentMethod', 'Payment method')}
                  label={t('selectPaymentMethod', 'Select payment method')}
                  items={paymentModes}
                  itemToString={(item) => (item ? item.name : '')}
                  invalid={!!errors?.payment?.[index]?.method}
                  invalidText={errors?.payment?.[index]?.method?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`payment.${index}.amount`}
              render={({ field }) => (
                <NumberInput
                  allowEmpty
                  disableWheel
                  hideSteppers
                  id="paymentAmount"
                  invalid={!!errors?.payment?.[index]?.amount}
                  invalidText={errors?.payment?.[index]?.amount?.message}
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
              name={`payment.${index}.referenceCode`}
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
            <div className={styles.removeButtonContainer}>
              <IconButton
                kind="danger--tertiary"
                label={t('removePaymentMethod', 'Remove payment method')}
                onClick={() => handleRemovePaymentMode(index)}>
                <TrashCan />
              </IconButton>
            </div>
          </div>
        ))}
      <Button
        disabled={disablePayment}
        onClick={handleAppendPaymentMode}
        className={styles.paymentButtons}
        renderIcon={(props) => <Add size={24} {...props} />}
        iconDescription={t('add', 'Add')}>
        {t('addPaymentMethod', 'Add payment method')}
      </Button>
    </div>
  );
};

export default PaymentForm;
