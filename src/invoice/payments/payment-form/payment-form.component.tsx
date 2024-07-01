import React, { useCallback, useState, useEffect } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TrashCan, Add } from '@carbon/react/icons';
import { Button, Dropdown, NumberInputSkeleton, TextInput, NumberInput } from '@carbon/react';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { type PaymentFormValue } from '../payments.component';
import { usePaymentModes } from '../payment.resource';
import styles from './payment-form.scss';

type PaymentFormProps = {
  disablePayment: boolean;
  clientBalance: number;
  isSingleLineItemSelected: boolean;
  isSingleLineItem: boolean;
};

const DEFAULT_PAYMENT = { method: '', amount: 0, referenceCode: '' };

const PaymentForm: React.FC<PaymentFormProps> = ({
  disablePayment,
  clientBalance,
  isSingleLineItemSelected,
  isSingleLineItem,
}) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<PaymentFormValue>();
  const { paymentModes, isLoading, error } = usePaymentModes();
  const { fields, remove, append } = useFieldArray({ name: 'payment', control: control });
  const [isFormVisible, setIsFormVisible] = useState(isSingleLineItem);

  useEffect(() => {
    if (isSingleLineItem) {
      setIsFormVisible(true);
      if (fields.length === 0) {
        append(DEFAULT_PAYMENT);
      }
    }
  }, [isSingleLineItem, append, fields.length]);

  const handleAppendPaymentMode = useCallback(() => {
    setIsFormVisible(true);
    append(DEFAULT_PAYMENT);
  }, [append]);
  const handleRemovePaymentMode = useCallback((index) => remove(index), [remove]);

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
        fields.map((field, index) => (
          <div key={field.id} className={styles.paymentMethodContainer}>
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
                  id="paymentAmount"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  invalid={!!errors?.payment?.[index]?.amount}
                  invalidText={errors?.payment?.[index]?.amount?.message}
                  label={t('amount', 'Amount')}
                  placeholder={t('enterAmount', 'Enter amount')}
                />
              )}
            />
            <Controller
              name={`payment.${index}.referenceCode`}
              control={control}
              render={({ field }) => (
                <TextInput
                  id="paymentReferenceCode"
                  {...field}
                  labelText={t('referenceNumber', 'Reference number')}
                  placeholder={t('enterReferenceNumber', 'Enter ref. number')}
                  type="text"
                />
              )}
            />
            <div className={styles.removeButtonContainer}>
              <TrashCan onClick={() => handleRemovePaymentMode(index)} className={styles.removeButton} size={20} />
            </div>
          </div>
        ))}
      <Button
        disabled={disablePayment || (!isSingleLineItem && !isSingleLineItemSelected)}
        size="md"
        onClick={handleAppendPaymentMode}
        className={styles.paymentButtons}
        renderIcon={(props) => <Add size={24} {...props} />}
        iconDescription="Add">
        {t('addPaymentOptions', 'Add payment option')}
      </Button>
    </div>
  );
};

export default PaymentForm;
