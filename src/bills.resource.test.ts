// src/resources/bills.resource.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { mapBillProperties } from './billing.resource';
import type { PatientInvoice } from './types';

jest.mock('@openmrs/esm-framework', () => ({
  formatDate: jest.fn((date: any) => `formatted-${date}`),
  parseDate: jest.fn((date: any) => date),
}));

const createBaseBill = (overrides: Partial<PatientInvoice> = {}): PatientInvoice => ({
  uuid: 'uuid1',
  display: '12345 - John Doe',
  voided: false,
  voidReason: null,
  adjustedBy: [],
  billAdjusted: null,
  cashPoint: {
    uuid: 'cp1',
    name: 'Cash Point 1',
    location: { display: 'Location 1' },
  } as any,
  cashier: { display: 'Cashier' } as any,
  dateCreated: '2024-01-01T00:00:00Z',
  lineItems: [],
  patient: {
    display: '12345 - John Doe',
    uuid: 'patient-uuid',
  } as any,
  payments: [],
  receiptNumber: 'R123',
  status: 'PENDING',
  adjustmentReason: null,
  id: 1,
  resourceVersion: '1.0',
  ...overrides,
});

describe('mapBillProperties', () => {
  it('Single-item bill marked PAID → status should be PAID', () => {
    const bill = createBaseBill({
      lineItems: [{ paymentStatus: 'PAID', voided: false } as any],
    });
    const result = mapBillProperties(bill);
    expect(result.status).toBe('PAID');
  });

  it('Single-item bill marked PENDING → status should be PENDING', () => {
    const bill = createBaseBill({
      lineItems: [{ paymentStatus: 'PENDING', voided: false } as any],
    });
    const result = mapBillProperties(bill);
    expect(result.status).toBe('PENDING');
  });

  it('Multi-item bill with at least one PENDING → status should be PENDING', () => {
    const bill = createBaseBill({
      lineItems: [{ paymentStatus: 'PAID', voided: false } as any, { paymentStatus: 'PENDING', voided: false } as any],
    });
    const result = mapBillProperties(bill);
    expect(result.status).toBe('PENDING');
  });

  it('All paid multi-item bills → status should be PAID', () => {
    const bill = createBaseBill({
      lineItems: [{ paymentStatus: 'PAID', voided: false } as any, { paymentStatus: 'PAID', voided: false } as any],
    });
    const result = mapBillProperties(bill);
    expect(result.status).toBe('PAID');
  });

  it('Empty bill (0 active line items) → uses bill.status fallback', () => {
    const bill = createBaseBill({ status: 'PENDING', lineItems: [] });
    const result = mapBillProperties(bill);
    expect(result.status).toBe('PENDING');
  });
});
