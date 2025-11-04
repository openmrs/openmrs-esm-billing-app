import React, { useCallback, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ComboBox, InlineLoading, RadioButton, RadioButtonGroup, Stack, TextInput } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
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
  const { patientCategory, categoryConcepts, nonPayingPatientCategories } = useConfig();
  const { control, getValues, watch } = useForm<VisitAttributesFormValue>({
    mode: 'all',
    defaultValues: {},
    resolver: zodResolver(visitAttributesFormSchema),
  });

  const [paymentDetails, paymentMethods, insuranceSchema, policyNumber, patientCategoryValue] = watch([
    'paymentDetails',
    'paymentMethods',
    'insuranceScheme',
    'policyNumber',
    'patientCategory',
  ]);

  const { paymentModes, isLoading: isLoadingPaymentModes } = usePaymentMethods();
  const patientCategoryOptions = useMemo(() => {
    return Object.entries(nonPayingPatientCategories ?? {}).map(([key, uuid]) => ({
      // t('childUnder5', 'Child under 5')
      // t('student', 'Student')
      text: t(key),
      uuid,
    }));
  }, [nonPayingPatientCategories, t]);

  const createVisitAttributesPayload = useCallback(() => {
    const {
      paymentDetails,
      paymentMethods,
      insuranceScheme,
      policyNumber,
      patientCategory: patientCategoryValue,
    } = getValues();
    setPaymentMethod?.(paymentMethods);

    const formPayload = [
      { uuid: patientCategory.paymentDetails, value: paymentDetails },
      { uuid: patientCategory.paymentMethods, value: paymentMethods },
      { uuid: patientCategory.insuranceScheme, value: insuranceScheme },
      { uuid: patientCategory.policyNumber, value: policyNumber },
      { uuid: patientCategory.patientCategory, value: patientCategoryValue },
    ];

    const visitAttributesPayload = formPayload.filter(
      (item) => item.value !== undefined && item.value !== null && item.value !== '',
    );
    return Object.entries(visitAttributesPayload).map(([key, value]) => ({
      attributeType: value.uuid,
      value: value.value,
    }));
  }, [
    getValues,
    patientCategory.insuranceScheme,
    patientCategory.patientCategory,
    patientCategory.paymentDetails,
    patientCategory.paymentMethods,
    patientCategory.policyNumber,
    setPaymentMethod,
  ]);

  useEffect(() => {
    setAttributes(createVisitAttributesPayload());
  }, [
    paymentDetails,
    paymentMethods,
    insuranceSchema,
    policyNumber,
    patientCategoryValue,
    setAttributes,
    createVisitAttributesPayload,
  ]);

  if (isLoadingPaymentModes) {
    return (
      <InlineLoading
        status="active"
        iconDescription={t('loadingDescription', 'Loading')}
        description={t('loading', 'Loading data') + '...'}
      />
    );
  }

  return (
    <Stack className={styles.stack} gap={5}>
      <Controller
        name="paymentDetails"
        control={control}
        render={({ field }) => (
          <RadioButtonGroup
            className={styles.radioButtonGroup}
            legendText={t('paymentDetails', 'Payment details')}
            name="payment-details"
            onChange={(selected) => field.onChange(selected)}
            orientation="vertical">
            <RadioButton labelText={t('paying', 'Paying')} value={categoryConcepts.payingDetails} id="radio-1" />
            <RadioButton
              labelText={t('nonPaying', 'Non paying')}
              value={categoryConcepts.nonPayingDetails}
              id="radio-2"
            />
          </RadioButtonGroup>
        )}
      />
      {paymentDetails === categoryConcepts.payingDetails && (
        <Controller
          control={control}
          name="paymentMethods"
          render={({ field }) => (
            <ComboBox
              id="paymentMethods"
              items={paymentModes}
              itemToString={(item) => (item ? item.name : '')}
              onChange={({ selectedItem }) => field.onChange(selectedItem?.uuid)}
              placeholder={t('selectPaymentMethod', 'Select payment method')}
              titleText={t('paymentMethod', 'Payment method')}
            />
          )}
        />
      )}
      {paymentMethods === categoryConcepts.insuranceDetails && paymentDetails === categoryConcepts.payingDetails && (
        <>
          <Controller
            control={control}
            name="insuranceScheme"
            render={({ field }) => (
              <TextInput
                id="insurance-scheme"
                labelText={t('insuranceScheme', 'Insurance scheme')}
                onChange={(e) => field.onChange(e.target.value)}
                type="text"
              />
            )}
          />
          <Controller
            control={control}
            name="policyNumber"
            render={({ field }) => (
              <TextInput
                {...field}
                id="policy-number"
                labelText={t('policyNumber', 'Policy number')}
                onChange={(e) => field.onChange(e.target.value)}
                type="text"
              />
            )}
          />
        </>
      )}
      {paymentDetails === categoryConcepts.nonPayingDetails && (
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
    </Stack>
  );
};

export default VisitAttributesForm;
