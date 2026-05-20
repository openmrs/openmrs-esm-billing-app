import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';
import { usePatientPaymentStatus } from '../billing.resource';
import styles from './payment-status-tag.scss';

/**
 * DO NOT DELETE.
 * Adds translations for the payment status strings
 * t('PAID', 'PAID')
 * t('UNPAID', 'UNPAID')
 */

type PaymentStatusTagProps = { patientUuid: string };

const PaymentStatusTag: React.FC<PaymentStatusTagProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { paymentStatus, isLoading, isValidating, error } = usePatientPaymentStatus(patientUuid);
  return (
    <>
      {!isLoading && !isValidating && !error && (
        <Toggletip className={styles.tag}>
          <ToggletipButton label={paymentStatus.status}>
            <Tag type={paymentStatus.status === 'PAID' ? 'green' : paymentStatus.status === 'UNPAID' ? 'red' : 'gray'}>
              {t(paymentStatus.status, paymentStatus.status)}
            </Tag>
          </ToggletipButton>
          <ToggletipContent>
            <div role="tooltip">
              <h6 className={styles.heading}>{paymentStatus.reason}</h6>
            </div>
          </ToggletipContent>
        </Toggletip>
      )}
    </>
  );
};

export default PaymentStatusTag;
