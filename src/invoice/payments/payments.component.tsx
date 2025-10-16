import React from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { navigate, showSnackbar, useConfig, useVisit } from '@openmrs/esm-framework';
import { Button } from '@carbon/react';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import { convertToCurrency } from '../../helpers';
import { createPaymentPayload } from './utils';
import { InvoiceBreakDown } from './invoice-breakdown/invoice-breakdown.component';
import { processBillPayment } from '../../billing.resource';
import { type MappedBill } from '../../types';
import { updateBillVisitAttribute } from './payment.resource';
import { useBillableServices } from '../../billable-services/billable-service.resource';
import PaymentForm from './payment-form/payment-form.component';
import PaymentHistory from './payment-history/payment-history.component';
import styles from './payments.scss';

type PaymentProps = {
  bill: MappedBill;
  mutate: () => void;
};

export type Payment = { method: string; amount: number | undefined; referenceCode?: number | string };

export type PaymentFormValue = {
  payment: Array<Payment>;
};

const Payments: React.FC<PaymentProps> = ({ bill, mutate }) => {
  const { t } = useTranslation();
  const { billableServices } = useBillableServices();
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

  const paymentFormSchema = z.object({ payment: z.array(paymentSchema) });
  const { currentVisit } = useVisit(bill?.patientUuid);
  const { defaultCurrency } = useConfig();
  const methods = useForm<PaymentFormValue>({
    mode: 'all',
    defaultValues: { payment: [] },
    resolver: zodResolver(paymentFormSchema),
  });

  const formValues = useWatch({
    name: 'payment',
    control: methods.control,
  });

  const handleNavigateToBillingDashboard = () =>
    navigate({
      to: window.getOpenmrsSpaBase() + 'home/billing',
    });

  if (!bill) {
    return null;
  }

  const amountDue = bill.totalAmount - bill.tenderedAmount;

  const handleProcessPayment = async () => {
    const amountBeingTendered = formValues?.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const amountRemaining = amountDue - amountBeingTendered;
    const paymentPayload = createPaymentPayload(bill, bill?.patientUuid, formValues, amountRemaining, billableServices);
    paymentPayload.payments.forEach((payment) => {
      payment.dateCreated = new Date(payment.dateCreated);
    });

    try {
      await processBillPayment(paymentPayload, bill.uuid);
      showSnackbar({
        title: t('billPayment', 'Bill payment'),
        subtitle: t('paymentProcessedSuccessfully', 'Payment processed successfully'),
        kind: 'success',
      });
      if (currentVisit) {
        updateBillVisitAttribute(currentVisit);
      }
      methods.reset({ payment: [{ method: '', amount: null, referenceCode: '' }] });
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
            <PaymentForm disablePayment={amountDue <= 0} isSingleLineItem={bill.lineItems.length === 1} />
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.paymentTotals}>
          <InvoiceBreakDown
            label={t('totalAmount', 'Total amount')}
            value={convertToCurrency(bill.totalAmount, defaultCurrency)}
          />
          <InvoiceBreakDown
            label={t('totalTendered', 'Total tendered')}
            value={convertToCurrency(bill.tenderedAmount, defaultCurrency)}
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
            <Button onClick={handleProcessPayment} disabled={!formValues?.length || !methods.formState.isValid}>
              {t('processPayment', 'Process Payment')}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export default Payments;
