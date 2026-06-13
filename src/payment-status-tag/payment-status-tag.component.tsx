import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';
import { usePatientPaymentStatus } from '../billing.resource';
import styles from './payment-status-tag.scss';

/**
 * DO NOT DELETE — intentional extraction hints for i18next-parser.
 * The t() calls in this component use a dynamic key (paymentStatus.status),
 * which the parser cannot statically detect. These dummy calls ensure 'PAID'
 * and 'UNPAID' are included in the translation catalogue.
 * t('PAID', 'PAID')
 * t('UNPAID', 'UNPAID')
 */

type PaymentStatusTagProps = {
  patientUuid: string;
  renderedFrom: string;
};

const PaymentStatusTag: React.FC<PaymentStatusTagProps> = ({ patientUuid, renderedFrom }) => {
  const isPatientChart = renderedFrom === 'patient-chart';

  if (!isPatientChart) {
    return null;
  }

  return <PaymentStatusTagInner patientUuid={patientUuid} />;
};

const PaymentStatusTagInner: React.FC<Omit<PaymentStatusTagProps, 'renderedFrom'>> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { paymentStatus, isLoading, error } = usePatientPaymentStatus(patientUuid);
  return !isLoading && !error && paymentStatus && paymentStatus.status !== 'UNKNOWN' ? (
    <Toggletip className={styles.tag}>
      <ToggletipButton label={t(paymentStatus.status, paymentStatus.status)}>
        <Tag type={paymentStatus.status === 'PAID' ? 'green' : 'red'}>
          {t(paymentStatus.status, paymentStatus.status)}
        </Tag>
      </ToggletipButton>
      <ToggletipContent>
        <div role="tooltip">
          <p>{paymentStatus.reason}</p>
        </div>
      </ToggletipContent>
    </Toggletip>
  ) : null;
};

export default PaymentStatusTag;
