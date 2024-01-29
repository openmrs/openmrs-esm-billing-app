import React from 'react';
import { RadioButtonGroup, RadioButton } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from './billing-form.scss';

type BillingFormProps = {
  patientUuid: string;
};

const BillingForm: React.FC<BillingFormProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  return (
    <div className={styles.billingFormContainer}>
      <RadioButtonGroup
        legendText={t('selectCategory', 'Select category')}
        name="radio-button-group"
        defaultSelected="radio-1">
        <RadioButton labelText={t('drug', 'Drug')} value="radio-1" id="radio-1" />
        <RadioButton labelText={t('nonDrug', 'Non drug')} value="radio-2" id="radio-2" />
      </RadioButtonGroup>
    </div>
  );
};

export default BillingForm;
