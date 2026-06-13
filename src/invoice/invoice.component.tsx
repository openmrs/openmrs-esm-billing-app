import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, InlineLoading, Tooltip } from '@carbon/react';
import { Add, Printer } from '@carbon/react/icons';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useTranslation } from 'react-i18next';
import {
  ErrorState,
  ExtensionSlot,
  formatDate,
  launchWorkspace2,
  navigate,
  parseDate,
  showModal,
  showSnackbar,
  useConfig,
  usePatient,
} from '@openmrs/esm-framework';
import { convertToCurrency } from '../helpers';
import { useBill, useDefaultFacility } from '../billing.resource';
import type { BillingConfig } from '../config-schema';
import InvoiceTable from './invoice-table.component';
import Payments from './payments/payments.component';
import PrintReceipt from './printable-invoice/print-receipt.component';
import PrintableInvoice from './printable-invoice/printable-invoice.component';
import { BillDiscountStatus, BillStatus, RefundStatus } from '../types';
import DiscountsTable from '../discounts/discounts-table.component';
import RefundsTable from '../refunds/refunds-table.component';
import styles from './invoice.scss';

interface InvoiceDetailsProps {
  label: string;
  value: string | number;
}

const Invoice: React.FC = () => {
  const { t } = useTranslation();
  const { data } = useDefaultFacility();
  const { billUuid, patientUuid } = useParams();
  const { patient, isLoading: isLoadingPatient } = usePatient(patientUuid);
  const { bill, isLoading: isLoadingBill, error, isValidating, mutate } = useBill(billUuid);
  const [isPrinting, setIsPrinting] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const onBeforeGetContentResolve = useRef<(() => void) | null>(null);
  const { defaultCurrency } = useConfig<BillingConfig>();

  const discounts = (bill?.discounts ?? []).filter((d) => !d.voided);
  const billLevelDiscountExists = discounts.some((d) => !d.lineItemUuid);
  const lineItemDiscountExists = discounts.some((d) => !!d.lineItemUuid);
  const billStatusEligible = bill?.status === BillStatus.PENDING || bill?.status === BillStatus.POSTED;
  const showRequestDiscountButton = !!bill && billStatusEligible && !billLevelDiscountExists;
  const hasApprovedDiscount = discounts.some((d) => d.status === BillDiscountStatus.APPROVED);

  const refunds = (bill?.refunds ?? []).filter((r) => !r.voided);
  const billStatusRefundEligible = bill?.status === BillStatus.PAID || bill?.status === BillStatus.PARTIALLY_REFUNDED;
  const activeRefunds = refunds.filter(
    (r) => r.status === RefundStatus.REQUESTED || r.status === RefundStatus.APPROVED,
  );
  const activeBillLevelRefund = activeRefunds.some((r) => !r.lineItemUuid);
  const activeLineRefundUuids = new Set(activeRefunds.flatMap((r) => (r.lineItemUuid ? [r.lineItemUuid] : [])));
  const showRequestRefundButton = !!bill && billStatusRefundEligible && !activeBillLevelRefund;

  const handleRequestRefund = () => {
    if (!bill) return;
    if (bill.netAmount == null) {
      showSnackbar({
        title: t('refundUnavailable', 'Refund unavailable'),
        subtitle: t('refundUnavailableSubtitle', 'Bill amount could not be determined. Please reload and try again.'),
        kind: 'error',
      });
      return;
    }
    const totalAlreadyRefunded = refunds
      .filter((r) => r.status === RefundStatus.APPROVED || r.status === RefundStatus.COMPLETED)
      .reduce((s, r) => s + r.refundAmount, 0);
    const remainingRefundable = bill.netAmount - totalAlreadyRefunded;
    const dispose = showModal('request-refund-modal', {
      bill: {
        uuid: bill.uuid,
        total: bill.totalAmount ?? 0,
        amountAfterDiscount: bill.netAmount,
        receiptNumber: bill.receiptNumber,
        lineItemCount: bill.lineItems?.length ?? 0,
      },
      remainingRefundable: Math.max(0, remainingRefundable),
      onMutate: () => mutate(),
      closeModal: () => dispose(),
    });
  };

  const handleRequestDiscount = () => {
    const dispose = showModal('request-discount-modal', {
      bill: {
        uuid: bill!.uuid,
        total: bill!.totalAmount ?? 0,
        amountDue: Math.max(0, (bill!.netAmount ?? bill!.totalAmount ?? 0) - (bill!.tenderedAmount ?? 0)),
        receiptNumber: bill!.receiptNumber,
        lineItemCount: bill!.lineItems?.length ?? 0,
      },
      onMutate: () => mutate(),
      closeModal: () => dispose(),
    });
  };

  const handleAfterPrint = useCallback(() => {
    onBeforeGetContentResolve.current = null;
    setIsPrinting(false);
  }, []);

  const handleOnBeforeGetContent = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (patient && bill) {
        setIsPrinting(true);
        onBeforeGetContentResolve.current = resolve;
      }
    });
  }, [bill, patient]);

  const handleFinalizeBill = () => {
    const dispose = showModal('finalize-bill-confirmation-modal', {
      bill,
      onMutate: mutate,
      closeModal: () => dispose(),
    });
  };

  const handleDeleteBill = () => {
    const dispose = showModal('delete-bill-confirmation-modal', {
      bill,
      onSuccess: () => navigate({ to: window.getOpenmrsSpaBase() + 'home/billing' }),
      closeModal: () => dispose(),
    });
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Invoice ${bill?.receiptNumber} - ${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0].family}`,
    onBeforePrint: handleOnBeforeGetContent,
    onAfterPrint: handleAfterPrint,
    preserveAfterPrint: false,
    onPrintError: (_, error) =>
      showSnackbar({
        title: t('errorPrintingInvoice', 'Error printing invoice'),
        kind: 'error',
        subtitle: error.message,
      }),
  });

  useEffect(() => {
    if (isPrinting && onBeforeGetContentResolve.current) {
      onBeforeGetContentResolve.current();
    }
  }, [isPrinting]);

  // Do not remove this comment. Adds the translation keys for the invoice details
  /**
   * t('totalAmount', 'Total amount')
   * t('amountTendered', 'Amount tendered')
   * t('invoiceNumber', 'Invoice number')
   * t('dateAndTime', 'Date and time')
   * t('invoiceStatus', 'Invoice status')
   */
  const invoiceDetails: Record<string, string | number | undefined> = {
    [t('dateBillCreated', 'Date bill created')]: bill?.dateCreated
      ? formatDate(parseDate(bill.dateCreated), { mode: 'wide' })
      : '--',
    [t('totalAmount', 'Total amount')]: convertToCurrency(bill?.totalAmount, defaultCurrency),
    ...(hasApprovedDiscount
      ? {
          [t('discount', 'Discount')]:
            `- ${convertToCurrency((bill?.totalAmount ?? 0) - (bill?.netAmount ?? 0), defaultCurrency)}`,
          [t('netAmount', 'Net amount')]: convertToCurrency(bill?.netAmount, defaultCurrency),
        }
      : {}),
    [t('amountTendered', 'Amount tendered')]: convertToCurrency(bill?.tenderedAmount, defaultCurrency),
    [t('amountDue', 'Amount due')]: convertToCurrency(
      bill ? (bill.netAmount ?? 0) - (bill.tenderedAmount ?? 0) : undefined,
      defaultCurrency,
    ),
    [t('invoiceNumber', 'Invoice number')]: bill?.receiptNumber,
    [t('invoiceStatus', 'Invoice status')]: bill?.status,
  };

  if (isLoadingPatient || isLoadingBill) {
    return (
      <div className={styles.invoiceContainer}>
        <InlineLoading
          className={styles.loader}
          description={`${t('loadingBillInfo', 'Loading bill information')}...`}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <ErrorState headerTitle={t('invoiceError', 'Invoice error')} error={error} />
      </div>
    );
  }

  return (
    <div className={styles.invoiceContainer}>
      {patient && patientUuid && <ExtensionSlot name="patient-header-slot" state={{ patient, patientUuid }} />}
      <div className={styles.actionsContainer}>
        {isValidating && (
          <span>
            <InlineLoading status="active" />
          </span>
        )}
        {showRequestDiscountButton && (
          <Button kind="tertiary" onClick={handleRequestDiscount} disabled={lineItemDiscountExists}>
            {t('requestDiscount', 'Request discount')}
          </Button>
        )}
        {showRequestRefundButton &&
          (activeLineRefundUuids.size > 0 ? (
            <Tooltip
              align="bottom"
              label={t('refundInProgress', 'A refund is already in progress for one or more line items')}>
              <Button kind="tertiary" onClick={handleRequestRefund} disabled>
                {t('requestRefund', 'Request refund')}
              </Button>
            </Tooltip>
          ) : (
            <Button kind="tertiary" onClick={handleRequestRefund}>
              {t('requestRefund', 'Request refund')}
            </Button>
          ))}
        {bill?.status === BillStatus.PENDING && (
          <>
            <Button
              kind="ghost"
              renderIcon={Add}
              onClick={() =>
                launchWorkspace2('billing-form-workspace', {
                  patientUuid,
                  billUuid: bill.uuid,
                  onMutate: mutate,
                })
              }>
              {t('addItemsToBill', 'Add items to bill')}
            </Button>
            <Button kind="danger--ghost" onClick={handleDeleteBill}>
              {t('deleteBill', 'Delete bill')}
            </Button>
            <Button kind="primary" onClick={handleFinalizeBill}>
              {t('finalizeBill', 'Finalize bill')}
            </Button>
          </>
        )}
        <Button
          disabled={isPrinting || isLoadingPatient || isLoadingBill}
          onClick={handlePrint}
          renderIcon={(props) => <Printer size={24} {...props} />}
          iconDescription={t('printBill', 'Print bill')}>
          {t('printBill', 'Print bill')}
        </Button>
        {bill && (bill.status === BillStatus.PAID || bill.tenderedAmount > 0) && <PrintReceipt billUuid={bill.uuid} />}
      </div>
      <div className={styles.detailsContainer}>
        <section className={styles.details}>
          {Object.entries(invoiceDetails).map(([key, val]) => (
            <InvoiceDetails key={key} label={key} value={val} />
          ))}
        </section>
      </div>

      <div className={styles.invoiceContent}>
        <InvoiceTable bill={bill} isLoadingBill={isLoadingBill} onMutate={mutate} />
        {bill && <DiscountsTable bill={bill} />}
        {bill && <RefundsTable bill={bill} onMutate={mutate} />}
        <Payments bill={bill} mutate={mutate} selectedLineItems={bill?.lineItems ?? []} />
      </div>

      {bill && patient && (
        <div className={styles.printContainer}>
          <PrintableInvoice bill={bill} patient={patient} defaultFacility={data} componentRef={componentRef} />
        </div>
      )}
    </div>
  );
};

function InvoiceDetails({ label, value }: InvoiceDetailsProps) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className={styles.label}>{t(label)}</h1>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export default Invoice;
