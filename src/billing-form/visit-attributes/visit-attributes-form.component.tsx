import React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextInput, InlineLoading, ComboBox, RadioButtonGroup, RadioButton } from '@carbon/react';
import { usePaymentMethods } from '../billing-form.resource';
import styles from './visit-attributes-form.scss';
import { useConfig } from '@openmrs/esm-framework';

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
  const { patientCatergory, catergoryConcepts, nonPayingPatientCategories } = useConfig();
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
  const patientCategoryOptions = React.useMemo(() => {
    return Object.entries(nonPayingPatientCategories ?? {}).map(([key, uuid]) => ({
      text: key,
      uuid,
    }));
  }, [nonPayingPatientCategories]);

  React.useEffect(() => {
    setAttributes(createVisitAttributesPayload());
  }, [paymentDetails, paymentMethods, insuranceSchema, policyNumber, patientCategory]);

  const createVisitAttributesPayload = () => {
    const { paymentDetails, paymentMethods, insuranceScheme, policyNumber, patientCategory } = getValues();
    setPaymentMethod?.(paymentMethods);
    const formPayload = [
      { uuid: patientCatergory.paymentDetails, value: paymentDetails },
      { uuid: patientCatergory.paymentMethods, value: paymentMethods },
      { uuid: patientCatergory.insuranceScheme, value: insuranceScheme },
      { uuid: patientCatergory.policyNumber, value: policyNumber },
      { uuid: patientCatergory.patientCategory, value: patientCategory },
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
            name="payment-details">
            <RadioButton labelText="Paying" value={catergoryConcepts.payingDetails} id="radio-1" />
            <RadioButton labelText="Non paying" value={catergoryConcepts.nonPayingDetails} id="radio-2" />
          </RadioButtonGroup>
        )}
      />

      {paymentDetails === catergoryConcepts.payingDetails && (
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

      {paymentMethods === catergoryConcepts.insuranceDetails && paymentDetails === catergoryConcepts.payingDetails && (
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

      {paymentDetails === catergoryConcepts.nonPayingDetails && (
        <Controller
          control={control}
          name="patientCategory"
          render={({ field }) => (
            <ComboBox
              className={styles.sectionField}
              onChange={({ selectedItem }) => field.onChange(selectedItem?.uuid)}
              id="patientCategory"
              items={patientCategoryOptions}
              itemToString={(item) => (item ? item.text : '')}
              titleText={t('patientCategory', 'Patient category')}
              placeholder={t('selectPatientCategory', 'Select patient category')}
            />
          )}
        />
      )}
    </section>
  );
};

export default VisitAttributesForm;
