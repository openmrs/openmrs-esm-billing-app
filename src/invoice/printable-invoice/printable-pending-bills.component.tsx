import React, { useMemo } from 'react';
import { type SessionLocation } from '@openmrs/esm-framework';
import { BillStatus, type MappedBill } from '../../types';
import PrintableInvoice from './printable-invoice.component';

interface PrintablePendingBillsProps {
  bills: MappedBill[];
  patient: fhir.Patient;
  componentRef: React.RefObject<HTMLDivElement>;
  defaultFacility: SessionLocation | null;
}

export const combinePendingBills = (bills: MappedBill[]): MappedBill | null => {
  if (!bills.length) {
    return null;
  }

  const lineItems = bills.flatMap((bill) => bill.lineItems ?? []);

  return {
    ...bills[0],
    uuid: bills.map((bill) => bill.uuid).join(','),
    receiptNumber: bills
      .map((bill) => bill.receiptNumber)
      .filter(Boolean)
      .join(', '),
    status: BillStatus.PENDING,
    lineItems,
    billingService: lineItems.map((item) => item.item || item.billableService || '--').join('  '),
    payments: bills.flatMap((bill) => bill.payments ?? []),
    discounts: bills.flatMap((bill) => bill.discounts ?? []),
    refunds: bills.flatMap((bill) => bill.refunds ?? []),
    totalAmount: bills.reduce((total, bill) => total + (bill.totalAmount ?? 0), 0),
    netAmount: bills.reduce((total, bill) => total + (bill.netAmount ?? bill.totalAmount ?? 0), 0),
    tenderedAmount: bills.reduce((total, bill) => total + (bill.tenderedAmount ?? 0), 0),
  };
};

const PrintablePendingBills: React.FC<PrintablePendingBillsProps> = ({
  bills,
  patient,
  componentRef,
  defaultFacility,
}) => {
  const combinedBill = useMemo(() => combinePendingBills(bills), [bills]);

  if (!combinedBill) {
    return null;
  }

  return (
    <PrintableInvoice
      bill={combinedBill}
      patient={patient}
      defaultFacility={defaultFacility}
      componentRef={componentRef}
    />
  );
};

export default PrintablePendingBills;
