import React from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { navigate, showSnackbar, useConfig, useVisit } from '@openmrs/esm-framework';
import { Button } from '@carbon/react';
import { CardHeader } from '@openmrs/esm-patient-common-lib';
import { type LineItem, type MappedBill } from '../../types';
import { convertToCurrency } from '../../helpers';
import { createPaymentPayload } from './utils';
import { processBillPayment } from '../../billing.resource';
import { InvoiceBreakDown } from './invoice-breakdown/invoice-breakdown.component';
import PaymentHistory from './payment-history/payment-history.component';
import PaymentForm from './payment-form/payment-form.component';
import { updateBillVisitAttribute } from './payment.resource';
import styles from './payments.scss';
import { useBillableServices } from '../../billable-services/billable-service.resource';

type PaymentProps = {
  bill: MappedBill;
  selectedLineItems: Array<LineItem>;
};

export type Payment = { method: string; amount: string | number; referenceCode?: number | string };

export type PaymentFormValue = {
  payment: Array<Payment>;
};

const Payments: React.FC<PaymentProps> = ({ bill, selectedLineItems }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig();
  const { billableServices, isLoading, isValidating, error, mutate } = useBillableServices();
  const paymentSchema = z.object({
    method: z.string().refine((value) => !!value, 'Payment method is required'),
    amount: z
      .number()
      .lte(bill?.totalAmount - bill?.tenderedAmount, { message: 'Amount paid should not be greater than amount due' }),
    referenceCode: z.union([z.number(), z.string()]).optional(),
  });

  const paymentFormSchema = z.object({ payment: z.array(paymentSchema) });
  const { currentVisit } = useVisit(bill?.patientUuid);
  const methods = useForm<PaymentFormValue>({
    mode: 'all',
    defaultValues: {},
    resolver: zodResolver(paymentFormSchema),
  });

  const formValues = useWatch({
    name: 'payment',
    control: methods.control,
  });

  const hasMoreThanOneLineItem = bill?.lineItems?.length > 1;

  const computedTotal = hasMoreThanOneLineItem ? computeTotalPrice(selectedLineItems) : bill?.totalAmount ?? 0;

  const totalAmountTendered = formValues?.reduce((curr: number, prev) => curr + Number(prev.amount) ?? 0, 0) ?? 0;
  const amountDue = Number(computedTotal) - (Number(bill?.tenderedAmount) + Number(totalAmountTendered));

  const handleNavigateToBillingDashboard = () =>
    navigate({
      to: window.getOpenmrsSpaBase() + 'home/billing',
    });

  const handleProcessPayment = () => {
    const paymentPayload = createPaymentPayload(bill, bill.patientUuid, formValues, amountDue, billableServices);
    processBillPayment(paymentPayload, bill.uuid).then(
      () => {
        showSnackbar({
          title: t('billPayment', 'Bill payment'),
          subtitle: 'Bill payment processing has been successful',
          kind: 'success',
          timeoutInMs: 3000,
        });
        if (currentVisit) {
          updateBillVisitAttribute(currentVisit);
        }

        handleNavigateToBillingDashboard();
      },
      (error) => {
        showSnackbar({ title: 'Bill payment error', kind: 'error', subtitle: error?.message });
      },
    );
  };

  const amountDueDisplay = (amount: number) => (amount < 0 ? 'Client balance' : 'Amount Due');

  return (
    <FormProvider {...methods}>
      <div className={styles.wrapper}>
        <div className={styles.paymentContainer}>
          <CardHeader title={t('payments', 'Payments')}>
            <span></span>
          </CardHeader>
          <div>
            {bill && <PaymentHistory bill={bill} />}
            <PaymentForm disablePayment={amountDue <= 0} amountDue={amountDue} />
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.paymentTotals}>
          <InvoiceBreakDown
            label={t('totalAmount', 'Total Amount')}
            value={convertToCurrency(computedTotal, defaultCurrency)}
          />
          <InvoiceBreakDown
            label={t('totalTendered', 'Total Tendered')}
            value={convertToCurrency(bill?.tenderedAmount + totalAmountTendered ?? 0, defaultCurrency)}
          />
          <InvoiceBreakDown label={t('discount', 'Discount')} value={'--'} />
          <InvoiceBreakDown
            hasBalance={amountDue < 0 ?? false}
            label={amountDueDisplay(amountDue)}
            value={convertToCurrency(amountDue ?? 0, defaultCurrency)}
          />
          <div className={styles.processPayments}>
            <Button onClick={handleNavigateToBillingDashboard} kind="secondary">
              {t('discard', 'Discard')}
            </Button>
            <Button onClick={() => handleProcessPayment()} disabled={!formValues?.length || !methods.formState.isValid}>
              {t('processPayment', 'Process Payment')}
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

const computeTotalPrice = (items) => {
  if (items && !items.length) {
    return 0;
  }

  let totalPrice = 0;

  items?.forEach((item) => {
    const { price, quantity } = item;
    totalPrice += price * quantity;
  });

  return totalPrice;
};

export default Payments;
