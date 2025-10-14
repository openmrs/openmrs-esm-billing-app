import { type OpenmrsResource } from '@openmrs/esm-framework';
import type { LineItem, MappedBill, PaymentPayload } from '../../types';

// TODO: Move this UUID to the config schema
const WAIVER_UUID = 'eb6173cb-9678-4614-bbe1-0ccf7ed9d1d4';

export const createBillWaiverPayload = (
  bill: MappedBill,
  amountWaived: number,
  totalAmount: number,
  lineItems: Array<LineItem>,
  billableLineItems: Array<OpenmrsResource>,
) => {
  const { cashier } = bill;

  const billPayment: PaymentPayload = {
    amount: parseFloat(totalAmount.toFixed(2)),
    amountTendered: parseFloat(Number(amountWaived).toFixed(2)),
    attributes: [],
    instanceType: WAIVER_UUID,
  };

  const processedLineItems = lineItems.map((lineItem) => ({
    ...lineItem,
    billableService: findBillableServiceUuid(billableLineItems, lineItem),
    paymentStatus: 'PAID',
  }));

  // Transform existing payments to PaymentPayload format
  const existingPayments: PaymentPayload[] = bill.payments.map((payment) => ({
    amount: payment.amount,
    amountTendered: payment.amountTendered,
    attributes: payment.attributes,
    instanceType: payment.instanceType.uuid,
    dateCreated: payment.dateCreated,
  }));

  const processedPayment = {
    cashPoint: bill.cashPointUuid,
    cashier: cashier.uuid,
    lineItems: processedLineItems,
    payments: [...existingPayments, billPayment],
    patient: bill.patientUuid,
  };

  return processedPayment;
};

const findBillableServiceUuid = (billableService: Array<OpenmrsResource>, lineItems: LineItem) => {
  return billableService.find((service) => service.name === lineItems.billableService)?.uuid ?? null;
};
