import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBills } from '../billing.resource';
import { type MappedBill } from '../types';
import { OperationalTag } from '@carbon/react';
import { showModal } from '@openmrs/esm-framework';
import styles from './payment-status-tag.scss';

interface PaymentStatusTagProps {
  patientUuid: string;
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending';

export function deriveOverAllPaymentStatus(bills: MappedBill[]): PaymentStatus | null {
  if (bills.length === 0) return null;

  let hasPosted = false;
  let hasPending = false;
  let hasPaid = false;

  for (const bill of bills) {
    if (bill.status === 'POSTED') hasPosted = true;
    if (bill.status === 'PENDING') hasPending = true;
    if (bill.status === 'PAID') hasPaid = true;
  }

  if (hasPaid && !hasPending && !hasPosted) return 'Paid'; //all bills are paid

  if (hasPosted) return 'Partially Paid'; //some bills are posted

  if (hasPaid && hasPending) return 'Partially Paid'; //mix of paid and pending

  if (hasPending && !hasPaid) return 'Pending'; //all bills are pending

  return null;
}

const PaymentStatusTag: React.FC<PaymentStatusTagProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { bills, isLoading } = useBills(patientUuid);

  const PaymentStatus = useMemo(() => {
    if (isLoading || !bills?.length) {
      return null;
    }
    return deriveOverAllPaymentStatus(bills);
  }, [bills, isLoading]);

  const showBillLineItem = useCallback(() => {
    const dispose = showModal('billing-item-details-modal', {
      bills,
      closeModal: () => dispose(),
    });
  }, [bills]);

  if (!PaymentStatus) return null;

  const tagProps: Record<PaymentStatus, { type: string; label: string }> = {
    'Partially Paid': {
      type: 'gray', // OperationalTag has no 'yellow'; yellow applied via CSS override
      label: t('partiallyPaid', 'Partially Paid'),
    },
    Pending: {
      type: 'red',
      label: t('pending', 'Pending'),
    },
    Paid: {
      type: 'green',
      label: t('paid', 'Paid'),
    },
  };
  const { type, label } = tagProps[PaymentStatus];

  return (
    <>
      <OperationalTag
        className={styles.StatusTag}
        text={`Payment status : ${label}`}
        onClick={showBillLineItem}
        type={type}
        data-status={PaymentStatus}
      />
    </>
  );
};

export default PaymentStatusTag;
