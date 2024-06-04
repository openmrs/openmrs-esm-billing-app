import { type LineItem, type MappedBill } from '../../types';
import { type Payment } from './payments.component';

const hasLineItem = (lineItems: Array<LineItem>, item: LineItem) => {
  if (lineItems?.length === 0) {
    return false;
  }
  const foundItem = lineItems.find((lineItem) => lineItem.uuid === item.uuid);
  return Boolean(foundItem);
};

export const createPaymentPayload = (
  bill: MappedBill,
  patientUuid: string,
  formValues: Array<Payment>,
  amountDue: number,
  billableServices: Array<any>,
  selectedLineItems: Array<LineItem>,
) => {
  const { cashier } = bill;
  const totalAmount = bill?.totalAmount;
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
    amountTendered: parseFloat(Number(formValue.amount).toFixed(2)),
    attributes: [],
    instanceType: formValue.method,
    dateCreated: new Date(),
  }));

  const updatedPayments = [...newPayments, ...previousPayments];
  const totalAmountRendered = updatedPayments.reduce((acc, payment) => acc + payment.amountTendered, 0);

  const updatedLineItems = bill?.lineItems.map((lineItem) => ({
    ...lineItem,
    billableService: getBillableServiceUuid(billableServices, lineItem.billableService),
    item: processBillItem?.(lineItem),
    paymentStatus:
      bill?.lineItems.length > 1
        ? hasLineItem(selectedLineItems ?? [], lineItem) && totalAmountRendered >= lineItem.price * lineItem.quantity
          ? 'PAID'
          : 'PENDING'
        : paymentStatus,
  }));

  const allItemsBillPaymentStatus =
    updatedLineItems.filter((item) => item.paymentStatus === 'PENDING').length === 0 ? 'PAID' : 'PENDING';

  const processedPayment = {
    cashPoint: bill?.cashPointUuid,
    cashier: cashier.uuid,
    lineItems: updatedLineItems,
    payments: [...updatedPayments],
    patient: patientUuid,
    status: selectedLineItems?.length > 0 ? allItemsBillPaymentStatus : paymentStatus,
  };

  return processedPayment;
};

export const getBillableServiceUuid = (billableServices: Array<any>, serviceName: string) => {
  return billableServices.length ? billableServices.find((service) => service.name === serviceName).uuid : null;
};
const processBillItem = (item) => (item.item || item.billableService)?.split(':')[0];
