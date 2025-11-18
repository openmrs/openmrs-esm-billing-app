import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useTranslation } from 'react-i18next';
import { ExtensionSlot, showSnackbar, useConfig, usePatient } from '@openmrs/esm-framework';
import InvoiceTable from './invoice-table.component';
import Payments from './payments/payments.component';
import PrintReceipt from './printable-invoice/print-receipt.component';
import PrintableInvoice from './printable-invoice/printable-invoice.component';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { convertToCurrency } from '../helpers';
import { useBill, useDefaultFacility } from '../billing.resource';
import type { BillingConfig } from '../config-schema';
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
  const { bill, isLoading: isLoadingBill, error, mutate } = useBill(billUuid);
  const [isPrinting, setIsPrinting] = useState(false);
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
        <div>
          <Button
            disabled={isPrinting || isLoadingPatient || isLoadingBill}
            onClick={handlePrint}
            renderIcon={(props) => <Printer size={24} {...props} />}
            iconDescription={t('printBill', 'Print bill')}>
            {t('printBill', 'Print bill')}
          </Button>
          {(bill?.status === 'PAID' || bill?.tenderedAmount > 0) && <PrintReceipt billId={bill?.id} />}
        </div>
      </div>

      <div className={styles.invoiceContent}>
        <InvoiceTable bill={bill} isLoadingBill={isLoadingBill} />
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
