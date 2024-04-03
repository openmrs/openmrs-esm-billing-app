import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, InlineLoading } from '@carbon/react';
import { Printer } from '@carbon/react/icons';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useTranslation } from 'react-i18next';
import { ExtensionSlot, useConfig, usePatient } from '@openmrs/esm-framework';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { convertToCurrency } from '../helpers';
import { type LineItem } from '../types';
import { useBill } from '../billing.resource';
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
  const { billUuid, patientUuid } = useParams();
  const { patient, isLoading: isLoadingPatient } = usePatient(patientUuid);
  const { bill, isLoading: isLoadingBill, error, mutate } = useBill(billUuid);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const componentRef = useRef<HTMLDivElement>(null);
  const onBeforeGetContentResolve = useRef<(() => void) | null>(null);
  const handleSelectItem = (lineItems: Array<LineItem>) => {
    setSelectedLineItems(lineItems);
  };
  const { defaultCurrency } = useConfig();

  const handleAfterPrint = useCallback(() => {
    onBeforeGetContentResolve.current = null;
    setIsPrinting(false);
  }, []);

  const reactToPrintContent = useCallback(() => componentRef.current, []);

  const handleOnBeforeGetContent = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (patient && bill) {
        setIsPrinting(true);
        onBeforeGetContentResolve.current = resolve;
      }
    });
  }, [bill, patient]);

  const handlePrint = useReactToPrint({
    content: reactToPrintContent,
    documentTitle: `Invoice ${bill?.receiptNumber} - ${patient?.name?.[0]?.given?.join(' ')} ${
      patient?.name?.[0].family
    }`,
    onBeforeGetContent: handleOnBeforeGetContent,
    onAfterPrint: handleAfterPrint,
    removeAfterPrint: true,
  });

  useEffect(() => {
    if (isPrinting && onBeforeGetContentResolve.current) {
      onBeforeGetContentResolve.current();
    }
  }, [isPrinting]);

  useEffect(() => {
    const unPaidLineItems = bill?.lineItems?.filter((item) => item.paymentStatus === 'PENDING') ?? [];
    setSelectedLineItems(unPaidLineItems);
  }, [bill?.lineItems]);

  const invoiceDetails = {
    'Total Amount': convertToCurrency(bill?.totalAmount, defaultCurrency),
    'Amount Tendered': convertToCurrency(bill?.tenderedAmount, defaultCurrency),
    'Invoice Number': bill?.receiptNumber,
    'Date And Time': bill?.dateCreated,
    'Invoice Status': bill?.status,
  };

  if (isLoadingPatient && isLoadingBill) {
    return (
      <div className={styles.invoiceContainer}>
        <InlineLoading
          className={styles.loader}
          status="active"
          iconDescription="Loading"
          description="Loading patient header..."
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
            disabled={isPrinting}
            onClick={handlePrint}
            renderIcon={(props) => <Printer size={24} {...props} />}
            iconDescription="Print bill"
            size="md">
            {t('printBill', 'Print bill')}
          </Button>
          {bill?.status === 'PAID' ? <PrintReceipt billId={bill?.id} /> : null}
        </div>
      </div>

      <InvoiceTable bill={bill} isLoadingBill={isLoadingBill} onSelectItem={handleSelectItem} />
      <Payments bill={bill} mutate={mutate} selectedLineItems={selectedLineItems} />

      <div className={styles.printContainer} ref={componentRef}>
        {isPrinting && <PrintableInvoice bill={bill} patient={patient} isLoading={isLoadingPatient} />}
      </div>
    </div>
  );
};

function InvoiceDetails({ label, value }: InvoiceDetailsProps) {
  return (
    <div>
      <h1 className={styles.label}>{label}</h1>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export default Invoice;
