import React from 'react';
import { Button } from '@carbon/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CardHeader, navigate, showSnackbar, useConfig, useVisit } from '@openmrs/esm-framework';
import { InvoiceBreakDown } from './invoice-breakdown/invoice-breakdown.component';
import PaymentForm from './payment-form/payment-form.component';
import PaymentHistory from './payment-history/payment-history.component';
import { processBillPayment } from '../../billing.resource';
import { updateBillVisitAttribute } from './payment.resource';
import { convertToCurrency } from '../../helpers';
import type { MappedBill } from '../../types';
import styles from './payments.scss';

type PaymentProps = {
  bill: MappedBill;
  mutate: () => void;
};

export type Payment = { method: string; amount: number | undefined; referenceCode?: number | string };

export type PaymentFormValue = {
  payment: Payment;
};

const Payments: React.FC<PaymentProps> = ({ bill, mutate }) => {
  const { t } = useTranslation();
  const paymentSchema = z.object({
    method: z.string().refine((value) => !!value, 'Payment method is required'),
    amount: z
      .number({
        required_error: t('amountRequired', 'Amount is required'),
        invalid_type_error: t('amountRequired', 'Amount is required'),
      })
      .positive({ message: t('amountMustBePositive', 'Amount must be greater than 0') })
      .max(bill?.totalAmount - bill?.tenderedAmount, {
        message: t('paymentAmountCannotExceedAmountDue', 'Payment amount cannot exceed amount due'),
      }),
    referenceCode: z.union([z.number(), z.string()]).optional(),
  });

  const paymentFormSchema = z.object({ payment: paymentSchema });
  const { currentVisit } = useVisit(bill?.patientUuid);
  const { defaultCurrency } = useConfig();
  const defaultPaymentValues: PaymentFormValue = {
    payment: { method: '', amount: undefined, referenceCode: '' },
  };

  const methods = useForm<PaymentFormValue>({
    mode: 'all',
    defaultValues: defaultPaymentValues,
    resolver: zodResolver(paymentFormSchema),
  });

  const formValues = useWatch({
    name: 'payment',
    control: methods.control,
    defaultValue: defaultPaymentValues.payment,
  });

  const handleNavigateToBillingDashboard = () =>
    navigate({
      to: window.getOpenmrsSpaBase() + 'home/billing',
    });

  if (!bill) {
    return null;
  }

  const amountDue = (bill.totalAmount ?? 0) - (bill.tenderedAmount ?? 0);

  const handleProcessPayment = async () => {
    if (!formValues?.method || formValues.amount == null) {
      return;
    }

    try {
      await processBillPayment(
        {
          instanceType: formValues.method,
          amountTendered: Number(formValues.amount),
          amount: bill.totalAmount ?? 0,
        },
        bill.uuid,
      );
      showSnackbar({
        title: t('billPayment', 'Bill payment'),
        subtitle: t('paymentProcessedSuccessfully', 'Payment processed successfully'),
        kind: 'success',
      });
      if (currentVisit) {
        updateBillVisitAttribute(currentVisit);
      }
      methods.reset(defaultPaymentValues);
      mutate();
    } catch (error) {
      showSnackbar({
        title: t('errorProcessingPayment', 'Error processing payment'),
        kind: 'error',
        subtitle: error?.message,
      });
    }
  };

  return (
    <FormProvider {...methods}>
      <div className={styles.wrapper}>
        <div className={styles.paymentContainer}>
          <CardHeader title={t('payments', 'Payments')}>
            <span></span>
          </CardHeader>
          <div>
            <PaymentHistory bill={bill} />
            <PaymentForm disablePayment={amountDue <= 0} />
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.paymentTotals}>
          <InvoiceBreakDown
            label={t('totalAmount', 'Total amount')}
            value={convertToCurrency(bill.totalAmount ?? 0, defaultCurrency)}
          />
          <InvoiceBreakDown
            label={t('totalTendered', 'Total tendered')}
            value={convertToCurrency(bill.tenderedAmount ?? 0, defaultCurrency)}
          />
          <InvoiceBreakDown label={t('discount', 'Discount')} value={'--'} />
          <InvoiceBreakDown
            hasBalance={amountDue < 0}
            label={t('amountDue', 'Amount due')}
            value={convertToCurrency(amountDue < 0 ? -amountDue : amountDue, defaultCurrency)}
          />
          <div className={styles.processPayments}>
            <Button onClick={handleNavigateToBillingDashboard} kind="secondary">
              {t('discard', 'Discard')}
            </Button>
            <Button
              onClick={handleProcessPayment}
              disabled={!formValues?.method || formValues.amount == null || !methods.formState.isValid}>
              {t('processPayment', 'Process Payment')}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export default Payments;
