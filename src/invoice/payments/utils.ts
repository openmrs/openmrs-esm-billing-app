import { type OpenmrsResource } from '@openmrs/esm-framework';
import { type MappedBill } from '../../types';
import { type Payment } from './payments.component';

export const createPaymentPayload = (
  bill: MappedBill,
  patientUuid: string,
  formValues: Array<Payment>,
  amountDue: number,
  billableServices: Array<any>,
) => {
  const { cashier } = bill;
  const totalAmount = bill?.totalAmount;
  const paymentStatus = amountDue <= 0 ? 'PAID' : 'PENDING';

  const billPayment = formValues.map((formValue) => ({
    amount: parseFloat(totalAmount.toFixed(2)),
    amountTendered: parseFloat(Number(formValue.amount).toFixed(2)),
    attributes: [],
    instanceType: formValue.method,
  }));
  const processedPayment = {
    cashPoint: bill.cashPointUuid,
    cashier: cashier.uuid,
    lineItems: bill?.lineItems.map((lineItem) => ({
      ...lineItem,
      paymentStatus: 'PAID',
      billableService: getBillableServiceUuid(billableServices, lineItem.billableService),
    })),
    payments: [...billPayment],
    patient: patientUuid,
    status: paymentStatus,
  };

  return processedPayment;
};

const getBillableServiceUuid = (billableServices: Array<any>, serviceName: string) => {
  return billableServices.length ? billableServices.find((service) => service.name === serviceName).uuid : null;
};
