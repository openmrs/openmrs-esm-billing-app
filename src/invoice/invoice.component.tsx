import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useTranslation } from 'react-i18next';
import { ExtensionSlot, showSnackbar, useConfig, usePatient , useSession, userHasAccess } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { convertToCurrency } from '../helpers';
import { useBill, useDefaultFacility, updateBillItems } from '../billing.resource';
import type { BillingConfig } from '../config-schema';
import type { UpdateBillPayload } from '../types';
import { useBillableServices } from '../billable-services/billable-service.resource';
import { getBillableServiceUuid } from './payments/utils';

import InvoiceTable from './invoice-table.component';
import Payments from './payments/payments.component';
import PrintReceipt from './printable-invoice/print-receipt.component';
import PrintableInvoice from './printable-invoice/printable-invoice.component';
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const { billableServices } = useBillableServices();
  const { user } = useSession();
  const FINALIZE_PRIVILEGE = 'Billing: Post Bill'; // placeholder, confirm with backend

  const canFinalize = !!bill && bill.status === 'PENDING' && userHasAccess(FINALIZE_PRIVILEGE, user);

  const componentRef = useRef<HTMLDivElement>(null);
  const onBeforeGetContentResolve = useRef<(() => void) | null>(null);
  const { defaultCurrency } = useConfig<BillingConfig>();

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
   * t('invoiceNumber', 'Invoice #')
   * t('dateAndTime', 'Date and time')
   * t('invoiceStatus', 'Invoice status')
   */
  const invoiceDetails = {
    [t('totalAmount', 'Total amount')]: convertToCurrency(bill?.totalAmount, defaultCurrency),
    [t('amountTendered', 'Amount tendered')]: convertToCurrency(bill?.tenderedAmount, defaultCurrency),
    [t('invoiceNumber', 'Invoice number')]: bill?.receiptNumber,
    [t('dateAndTime', 'Date and time')]: bill?.dateCreated,
    [t('invoiceStatus', 'Invoice status')]: bill?.status,
  };

  const handleFinalizeBill = useCallback(async () => {
    if (!bill) {
      return;
    }

    // Extra safety: if there's no cashier/cashPoint, don't even call backend
    if (!bill.cashPointUuid || !bill.cashier?.uuid) {
      showSnackbar({
        title: t('errorFinalizingBill', 'Error finalizing bill'),
        subtitle: t(
          'missingBillingContext',
          'Cash point or cashier information is missing. Please make sure the bill has a valid cash point and cashier.',
        ),
        kind: 'error',
      });
      return;
    }

    setIsFinalizing(true);

    try {
      // Normalize line items just like EditBillLineItemModal does
      const normalizedLineItems = bill.lineItems.map((currItem) => ({
        ...currItem,
        billableService: getBillableServiceUuid(billableServices, currItem.billableService),
      }));

      const payload: UpdateBillPayload = {
        cashPoint: bill.cashPointUuid,
        cashier: bill.cashier.uuid,
        lineItems: normalizedLineItems,
        patient: bill.patientUuid,
        // TODO: This triggers bill rounding logic on the backend.
        // Requires rounding item to be configured in billing module options.
        status: 'POSTED',
        uuid: bill.uuid,
        // payments are optional; we leave them out, same as edit modal
      };

      await updateBillItems(payload);
      await mutate(); // refresh the bill details

      showSnackbar({
        title: t('billFinalized', 'Bill finalized'),
        subtitle: t('billMarkedAsPosted', 'The bill has been marked as posted.'),
        kind: 'success',
      });
    } catch (error: any) {
      showSnackbar({
        title: t('errorFinalizingBill', 'Error finalizing bill'),
        subtitle: error?.message ?? t('genericError', 'Something went wrong'),
        kind: 'error',
      });
    } finally {
      setIsFinalizing(false);
    }
  }, [bill, billableServices, mutate, t]);

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
      <div className={styles.detailsContainer}>
        <section className={styles.details}>
          {Object.entries(invoiceDetails).map(([key, val]) => (
            <InvoiceDetails key={key} label={key} value={val} />
          ))}
        </section>
        <div className={styles.actionsContainer}>
          {isValidating && (
            <span>
              <InlineLoading status="active" />
            </span>
          )}

          {canFinalize && (
            <Button
              kind="primary"
              disabled={isPrinting || isLoadingPatient || isLoadingBill || isFinalizing}
              onClick={handleFinalizeBill}>
              {isFinalizing ? t('finalizingBill', 'Finalizing…') : t('finalizeBill', 'Finalize bill')}
            </Button>
          )}

          <Button
            disabled={isPrinting || isLoadingPatient || isLoadingBill}
            onClick={handlePrint}
            renderIcon={(props) => <Printer size={24} {...props} />}
            iconDescription={t('printBill', 'Print bill')}>
            {t('printBill', 'Print bill')}
          </Button>

          {(bill?.status === 'PAID' || bill?.tenderedAmount > 0) && <PrintReceipt billUuid={bill?.uuid} />}
        </div>
      </div>

      <div className={styles.invoiceContent}>
        <InvoiceTable bill={bill} isLoadingBill={isLoadingBill} onMutate={mutate} />
        <Payments bill={bill} mutate={mutate} />
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
