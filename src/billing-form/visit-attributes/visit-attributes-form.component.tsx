import React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextInput, InlineLoading, ComboBox, RadioButtonGroup, RadioButton } from '@carbon/react';
import { usePaymentMethods } from '../billing-form.resource';
import styles from './visit-attributes-form.scss';

type VisitAttributesFormProps = {
  setAttributes: (state) => void;
  setPaymentMethod?: (value: any) => void;
};

type VisitAttributesFormValue = {
  paymentDetails: string;
  paymentMethods: string;
  insuranceScheme: string;
  policyNumber: string;
  patientCategory: string;
};

const visitAttributesFormSchema = z.object({
  paymentDetails: z.string(),
  paymentMethods: z.string(),
  insuranceSchema: z.string(),
  policyNumber: z.string(),
  patientCategory: z.string(),
});

const VisitAttributesForm: React.FC<VisitAttributesFormProps> = ({ setAttributes, setPaymentMethod }) => {
  const { t } = useTranslation();
  const { control, getValues, watch } = useForm<VisitAttributesFormValue>({
    mode: 'all',
    defaultValues: {},
    resolver: zodResolver(visitAttributesFormSchema),
  });
  const [paymentDetails, paymentMethods, insuranceSchema, policyNumber, patientCategory] = watch([
    'paymentDetails',
    'paymentMethods',
    'insuranceScheme',
    'policyNumber',
    'patientCategory',
  ]);

  const { paymentModes, isLoading: isLoadingPaymentModes } = usePaymentMethods();
  React.useEffect(() => {
    setAttributes(createVisitAttributesPayload());
  }, [paymentDetails, paymentMethods, insuranceSchema, policyNumber, patientCategory]);

  const createVisitAttributesPayload = () => {
    const { patientCategory, paymentMethods, policyNumber, paymentDetails } = getValues();
    setPaymentMethod(paymentMethods);
    const formPayload = [
      { uuid: 'caf2124f-00a9-4620-a250-efd8535afd6d', value: paymentDetails },
      { uuid: 'c39b684c-250f-4781-a157-d6ad7353bc90', value: paymentMethods },
      { uuid: '0f4f3306-f01b-43c6-af5b-fdb60015cb02', value: policyNumber },
      { uuid: '2d0fa959-6780-41f1-85b1-402045935068', value: insuranceSchema },
      { uuid: '3b9dfac8-9e4d-11ee-8c90-0242ac120002', value: patientCategory },
      { uuid: '919b51c9-8e2e-468f-8354-181bf3e55786', value: true },
    ];
    const visitAttributesPayload = formPayload.filter(
      (item) => item.value !== undefined && item.value !== null && item.value !== '',
    );
    return Object.entries(visitAttributesPayload).map(([key, value]) => ({
      attributeType: value.uuid,
      value: value.value,
    }));
  };

  if (isLoadingPaymentModes) {
    return (
      <InlineLoading
        status="active"
        iconDescription={t('loadingDescription', 'Loading')}
        description={t('loading', 'Loading data...')}
      />
    );
  }

  return (
    <section>
      <div className={styles.sectionTitle}>{t('paymentDetails', 'Payment Details')}</div>
      <Controller
        name="paymentDetails"
        control={control}
        render={({ field }) => (
          <RadioButtonGroup
            onChange={(selected) => field.onChange(selected)}
            orientation="vertical"
            legendText={t('paymentDetails', 'Payment Details')}
            name="payment-details-group">
            <RadioButton labelText="Paying" value="1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf" id="radio-1" />
            <RadioButton labelText="Non paying" value="a28d7929-050a-4249-a61a-551e9b8cc102" id="radio-2" />
          </RadioButtonGroup>
        )}
      />

      {paymentDetails === '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf' && (
        <Controller
          control={control}
          name="paymentMethods"
          render={({ field }) => (
            <ComboBox
              className={styles.sectionField}
              onChange={({ selectedItem }) => field.onChange(selectedItem?.uuid)}
              id="paymentMethods"
              items={paymentModes}
              itemToString={(item) => (item ? item.name : '')}
              titleText={t('paymentMethods', 'Payment methods')}
              placeholder={t('selectPaymentMethod', 'Select payment method')}
            />
          )}
        />
      )}

      {paymentMethods === 'beac329b-f1dc-4a33-9e7c-d95821a137a6' &&
        paymentDetails === '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf' && (
          <>
            <Controller
              control={control}
              name="insuranceScheme"
              render={({ field }) => (
                <TextInput
                  className={styles.sectionField}
                  onChange={(e) => field.onChange(e.target.value)}
                  id="insurance-scheme"
                  type="text"
                  labelText={t('insuranceScheme', 'Insurance scheme')}
                />
              )}
            />
            <Controller
              control={control}
              name="policyNumber"
              render={({ field }) => (
                <TextInput
                  className={styles.sectionField}
                  onChange={(e) => field.onChange(e.target.value)}
                  {...field}
                  id="policy-number"
                  type="text"
                  labelText={t('policyNumber', 'Policy number')}
                />
              )}
            />
          </>
        )}

      {paymentDetails === 'a28d7929-050a-4249-a61a-551e9b8cc102' && (
        <Controller
          control={control}
          name="patientCategory"
          render={({ field }) => (
            <ComboBox
              className={styles.sectionField}
              onChange={({ selectedItem }) => field.onChange(selectedItem?.uuid)}
              id="patientCategory"
              items={[
                { text: 'Child under 5', uuid: '2d61b762-6e32-4e2e-811f-ac72cbd3600a' },
                { text: 'Student', uuid: '159465AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
              ]}
              itemToString={(item) => (item ? item.text : '')}
              titleText={t('patientCategory', 'Patient category')}
            />
          )}
        />
      )}
    </section>
  );
};

export default VisitAttributesForm;
