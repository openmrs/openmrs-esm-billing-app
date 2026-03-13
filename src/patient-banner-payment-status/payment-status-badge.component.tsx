import React, { useState, useMemo } from 'react';
import { Tag } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useBills } from '../billing.resource';
import styles from './payment-status-badge.module.scss';
import PaymentStatusDetailsModal from './payment-status-details.modal';

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

    const totalBilled = bills.reduce((acc, bill) => acc + (bill.totalAmount || 0), 0);
    const totalPaid = bills.reduce((acc, bill) => acc + (bill.tenderedAmount || 0), 0);

    if (totalPaid >= totalBilled && totalBilled > 0) {
      return 'PAID';
    } else if (totalPaid > 0 && totalPaid < totalBilled) {
      return 'PARTIALLY_PAID';
    } else if (totalBilled > 0) {
      return 'UNPAID';
    }

    return null;
  }, [bills]);

  if (isLoading || !paymentStatus) {
    return null;
  }

  const getTagProps = (status: string) => {
    switch (status) {
      case 'PAID':
        return { type: 'green', label: t('paid', 'Paid') };
      case 'PARTIALLY_PAID':
        return { type: 'yellow', label: t('partiallyPaid', 'Partially Paid') };
      case 'UNPAID':
        return { type: 'red', label: t('unpaid', 'Unpaid') };
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
      <Tag
        type={tagProps.type as any}
        className={styles.paymentStatusTag}
        onClick={() => setIsModalOpen(true)}
        title={t('clickForDetails', 'Click for payment details')}>
        {tagProps.label}
      </Tag>
      {isModalOpen && (
        <PaymentStatusDetailsModal
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          bills={bills}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

export default PaymentStatusBadge;
