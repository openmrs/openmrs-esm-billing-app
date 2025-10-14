import { type MappedBill, type BillableService } from '../../types';
import { type Payment } from './payments.component';

export const createPaymentPayload = (
  bill: MappedBill,
  patientUuid: string,
  formValues: Array<Payment>,
  amountDue: number,
  billableServices: Array<BillableService>,
) => {
  const { cashier } = bill;
  const totalAmount = bill.totalAmount ?? 0;
  const paymentStatus = amountDue <= 0 ? 'PAID' : 'PENDING';
  const previousPayments = bill?.payments.map((payment) => ({
    amount: payment.amount,
    amountTendered: payment.amountTendered,
    attributes: [],
    instanceType: payment.instanceType.uuid,
    dateCreated: payment.dateCreated,
  }));

  const newPayments = formValues.map((formValue) => ({
    amount: parseFloat(totalAmount.toFixed(2)),
    amountTendered: parseFloat(Number(formValue.amount || 0).toFixed(2)),
    attributes: [],
    instanceType: formValue.method,
    dateCreated: new Date(),
  }));

  const updatedPayments = [...newPayments, ...previousPayments];

  const updatedLineItems = bill?.lineItems.map((lineItem) => ({
    ...lineItem,
    billableService: getBillableServiceUuid(billableServices, lineItem.billableService),
    item: processBillItem?.(lineItem),
    paymentStatus: lineItem.paymentStatus === 'PAID' ? 'PAID' : paymentStatus,
  }));

  const processedPayment = {
    cashPoint: bill?.cashPointUuid,
    cashier: cashier.uuid,
    lineItems: updatedLineItems,
    payments: [...updatedPayments],
    patient: patientUuid,
    status: paymentStatus,
  };

  return processedPayment;
};

export const getBillableServiceUuid = (billableServices: Array<BillableService>, serviceName: string) => {
  if (!billableServices.length) {
    return null;
  }
  const service = billableServices.find((service) => service.name === serviceName);
  return service?.uuid ?? null;
};

const processBillItem = (item: { item?: string; billableService?: string }) =>
  (item.item || item.billableService)?.split(':')[0];
