import { describe, expect, it } from 'vitest';
import { createBillingReportRows } from './billing-reports.component';
import { BillStatus, type MappedBill } from '../../types';

const createBill = (overrides: Partial<MappedBill>): MappedBill =>
  ({
    uuid: 'bill-1',
    id: 1,
    patientUuid: 'patient-1',
    patientName: 'Jane Doe',
    identifier: '10001',
    cashPointUuid: 'cash-point-1',
    cashPointName: 'Main',
    cashPointLocation: 'Reception',
    cashier: null,
    receiptNumber: 'R-001',
    status: BillStatus.PAID,
    dateCreated: '2026-08-10T12:00:00.000Z',
    lineItems: [
      {
        uuid: 'line-1',
        item: 'Paracetamol',
        quantity: 2,
        price: 500,
        status: 'PAID',
      },
    ],
    billingService: 'Paracetamol',
    payments: [
      {
        uuid: 'payment-1',
        instanceType: { uuid: 'cash', name: 'Cash', description: '', retired: false },
        attributes: [],
        amount: 1000,
        amountTendered: 1000,
        dateCreated: Date.now(),
        voided: false,
        resourceVersion: '1.0',
      },
    ],
    netAmount: 1000,
    ...overrides,
  }) as MappedBill;

describe('createBillingReportRows', () => {
  it('filters bills by the inclusive date range and maps report values', () => {
    const rows = createBillingReportRows(
      [createBill({}), createBill({ uuid: 'outside', dateCreated: '2026-07-31T23:59:59.000Z' })],
      [new Date('2026-08-01T00:00:00.000Z'), new Date('2026-08-31T23:59:59.999Z')],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'bill-1',
      identifier: '10001',
      patientName: 'Jane Doe',
      billedItems: 'Paracetamol (2)',
      amount: '1,000',
      status: BillStatus.PAID,
      paymentMode: 'Cash',
    });
  });
});
