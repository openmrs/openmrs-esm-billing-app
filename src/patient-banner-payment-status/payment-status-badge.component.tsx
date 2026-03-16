import React, { useMemo, useState } from 'react';
import { Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import PaymentStatusDetailsModal from '../modal/payment-status-details.modal';
import { useBills } from '../billing.resource';
import styles from './payment-status-badge.module.scss';

interface PaymentStatusBadgeProps {
  patientUuid: string;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { bills, isLoading } = useBills(patientUuid);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const paymentStatus = useMemo(() => {
    if (!bills || bills.length === 0) {
      return null;
    }

    const finalizedBills = bills.filter((bill) => bill.status !== 'PENDING');

    if (finalizedBills.length === 0) {
      return null;
    }

    const totalBilled = finalizedBills.reduce((sum, bill) => sum + (bill.totalAmount ?? 0), 0);
    const totalPaid = finalizedBills.reduce((sum, bill) => sum + (bill.tenderedAmount ?? 0), 0);

    if (totalBilled <= 0) {
      return null;
    }

    if (totalPaid >= totalBilled) {
      return 'PAID';
    }

    if (totalPaid > 0) {
      return 'PARTIALLY_PAID';
    }

    return 'UNPAID';
  }, [bills]);

  if (isLoading || !paymentStatus) {
    return null;
  }

  const getTagProps = (status: string) => {
    switch (status) {
      case 'PAID':
        return { type: 'green', label: t('paid', 'Paid'), className: '' };
      case 'PARTIALLY_PAID':
        return {
          type: 'warm-gray',
          label: t('partiallyPaid', 'Partially Paid'),
          className: styles.partialPaymentStatusTag,
        };
      case 'UNPAID':
        return { type: 'red', label: t('unpaid', 'Unpaid'), className: '' };
      default:
        return null;
    }
  };

  const tagProps = getTagProps(paymentStatus);

  if (!tagProps) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={styles.paymentStatusButton}
        onClick={() => setIsModalOpen(true)}
        aria-label={t('openPaymentStatusDetails', 'Open payment status details')}>
        <Tag type={tagProps.type as any} className={`${styles.paymentStatusTag} ${tagProps.className}`}>
          {tagProps.label}
        </Tag>
      </button>
      {isModalOpen ? (
        <PaymentStatusDetailsModal
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          bills={bills}
          isLoading={isLoading}
        />
      ) : null}
    </>
  );
};

export default PaymentStatusBadge;
