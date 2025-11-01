import { mapBillProperties } from './billing.resource';
import type { LineItem, PatientInvoice, Payment } from './types';

type CashPoint = PatientInvoice['cashPoint'];
type Provider = PatientInvoice['cashier'];
type Patient = PatientInvoice['patient'];

const mockFormatDate = jest.fn((date: Date, options?: Partial<{ mode: string }>) => `formatted-${date}`);
const mockParseDate = jest.fn((dateString: string): Date => new Date(dateString));

jest.mock('@openmrs/esm-framework', () => ({
  formatDate: (date: Date, options?: Partial<{ mode: string }>) => mockFormatDate(date, options),
  parseDate: (dateString: string) => mockParseDate(dateString),
}));

const createLineItem = (overrides: Partial<LineItem> = {}): LineItem => ({
  uuid: 'line-item-uuid',
  item: 'Service Item',
  billableService: 'Billable Service',
  paymentStatus: 'PENDING',
  quantity: 1,
  price: 100,
  priceName: 'Standard',
  priceUuid: 'price-uuid',
  lineItemOrder: 1,
  resourceVersion: '1.0',
  display: 'Line Item Display',
  voided: false,
  voidReason: null,
  ...overrides,
});

const createCashPoint = (overrides: Partial<CashPoint> = {}): CashPoint => ({
  uuid: 'cp1',
  name: 'Cash Point 1',
  description: 'Main cash point',
  retired: false,
  location: {
    uuid: 'loc1',
    display: 'Location 1',
    links: [],
  },
  ...overrides,
});

const createProvider = (overrides: Partial<Provider> = {}): Provider => ({
  uuid: 'provider-uuid',
  display: 'Cashier',
  links: [],
  ...overrides,
});

const createPatient = (overrides: Partial<Patient> = {}): Patient => ({
  uuid: 'patient-uuid',
  display: '12345 - John Doe',
  links: [],
  ...overrides,
});

const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
  uuid: 'payment-uuid',
  instanceType: {
    uuid: 'instance-uuid',
    name: 'Payment',
    description: 'Payment instance',
    retired: false,
  },
  attributes: [],
  amount: 250,
  amountTendered: 250,
  dateCreated: Date.now(),
  voided: false,
  resourceVersion: '1.0',
  ...overrides,
});

const createBaseBill = (overrides: Partial<PatientInvoice> = {}): PatientInvoice => ({
  uuid: 'uuid1',
  display: '12345 - John Doe',
  voided: false,
  voidReason: null,
  adjustedBy: [],
  billAdjusted: null,
  cashPoint: createCashPoint(),
  cashier: createProvider(),
  dateCreated: '2024-01-01T00:00:00Z',
  lineItems: [],
  patient: createPatient(),
  payments: [],
  receiptNumber: 'R123',
  status: 'PENDING',
  adjustmentReason: null,
  id: 1,
  resourceVersion: '1.0',
  ...overrides,
});

describe('mapBillProperties', () => {
  describe('Status calculation', () => {
    it('Single-item bill marked PAID → status should be PAID', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ paymentStatus: 'PAID' })],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PAID');
    });

    it('Single-item bill marked PENDING → status should be PENDING', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ paymentStatus: 'PENDING' })],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PENDING');
    });

    it('Multi-item bill with at least one PENDING → status should be PENDING', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ paymentStatus: 'PAID' }), createLineItem({ paymentStatus: 'PENDING' })],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PENDING');
    });

    it('All paid multi-item bills → status should be PAID', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ paymentStatus: 'PAID' }), createLineItem({ paymentStatus: 'PAID' })],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PAID');
    });

    it('Empty bill (0 active line items) → uses bill.status fallback', () => {
      const bill = createBaseBill({ status: 'PENDING', lineItems: [] });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PENDING');
    });

    it('Filters out voided line items when determining status', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ paymentStatus: 'PENDING', voided: true }),
          createLineItem({ paymentStatus: 'PAID' }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PAID');
      expect(result.lineItems).toHaveLength(1);
    });

    it('Handles mixed voided and non-voided items correctly', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ paymentStatus: 'PAID', voided: true }),
          createLineItem({ paymentStatus: 'PENDING' }),
          createLineItem({ paymentStatus: 'PAID' }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PENDING');
      expect(result.lineItems).toHaveLength(2);
    });

    it('All voided items → falls back to bill.status', () => {
      const bill = createBaseBill({
        status: 'PAID',
        lineItems: [
          createLineItem({ paymentStatus: 'PENDING', voided: true }),
          createLineItem({ paymentStatus: 'PENDING', voided: true }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PAID');
      expect(result.lineItems).toHaveLength(0);
    });
  });

  describe('Amount calculations', () => {
    it('Calculates totalAmount correctly for multiple items', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ price: 100, quantity: 2 }), createLineItem({ price: 50, quantity: 1 })],
      });
      const result = mapBillProperties(bill);
      expect(result.totalAmount).toBe(250);
    });

    it('Calculates tenderedAmount from single payment', () => {
      const bill = createBaseBill({
        payments: [createPayment({ amountTendered: 250 })],
      });
      const result = mapBillProperties(bill);
      expect(result.tenderedAmount).toBe(250);
    });

    it('Calculates tenderedAmount from multiple payments', () => {
      const bill = createBaseBill({
        payments: [
          createPayment({ amountTendered: 100 }),
          createPayment({ amountTendered: 150 }),
          createPayment({ amountTendered: 50 }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.tenderedAmount).toBe(300);
    });

    it('Handles null/undefined prices and quantities gracefully', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ price: null as unknown as number, quantity: 2 }),
          createLineItem({ price: 100, quantity: undefined as unknown as number }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.totalAmount).toBe(0);
    });

    it('Handles null/undefined amountTendered in payments', () => {
      const bill = createBaseBill({
        payments: [
          createPayment({ amountTendered: 100 }),
          createPayment({ amountTendered: null as unknown as number }),
          createPayment({ amountTendered: undefined as unknown as number }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.tenderedAmount).toBe(100);
    });

    it('Handles zero amounts correctly', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ price: 0, quantity: 5 }), createLineItem({ price: 100, quantity: 0 })],
        payments: [createPayment({ amountTendered: 0 })],
      });
      const result = mapBillProperties(bill);
      expect(result.totalAmount).toBe(0);
      expect(result.tenderedAmount).toBe(0);
    });

    it('Handles negative amounts (refunds)', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ price: -50, quantity: 1 })],
        payments: [createPayment({ amountTendered: -50 })],
      });
      const result = mapBillProperties(bill);
      expect(result.totalAmount).toBe(-50);
      expect(result.tenderedAmount).toBe(-50);
    });

    it('Handles decimal precision correctly', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ price: 0.1, quantity: 1 }), createLineItem({ price: 0.2, quantity: 1 })],
      });
      const result = mapBillProperties(bill);
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript
      expect(result.totalAmount).toBeCloseTo(0.3, 2);
    });

    it('Handles very large amounts', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ price: Number.MAX_SAFE_INTEGER, quantity: 1 })],
        payments: [createPayment({ amountTendered: Number.MAX_SAFE_INTEGER })],
      });
      const result = mapBillProperties(bill);
      expect(result.totalAmount).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.tenderedAmount).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Patient info parsing', () => {
    it('Parses patient name and identifier from display', () => {
      const bill = createBaseBill({
        patient: createPatient({ display: '12345 - John Doe' }),
      });
      const result = mapBillProperties(bill);
      expect(result.identifier).toBe('12345 ');
      expect(result.patientName).toBe(' John Doe');
      expect(result.patientUuid).toBe('patient-uuid');
    });

    it('Handles patient display without dash separator', () => {
      const bill = createBaseBill({
        patient: createPatient({ display: 'John Doe' }),
      });
      const result = mapBillProperties(bill);
      expect(result.identifier).toBe('John Doe');
      expect(result.patientName).toBeUndefined();
    });

    it('Handles patient display with multiple dashes', () => {
      const bill = createBaseBill({
        patient: createPatient({ display: '12345 - John - Doe - Jr' }),
      });
      const result = mapBillProperties(bill);
      expect(result.identifier).toBe('12345 ');
      // Note: split('-')[1] only takes the second element, not everything after first dash
      expect(result.patientName).toBe(' John ');
    });

    it('Handles empty patient display string', () => {
      const bill = createBaseBill({
        patient: createPatient({ display: '' }),
      });
      const result = mapBillProperties(bill);
      expect(result.identifier).toBe('');
      expect(result.patientName).toBeUndefined();
    });

    it('Handles undefined patient gracefully', () => {
      const bill = createBaseBill({
        patient: undefined as unknown as Patient,
      });
      const result = mapBillProperties(bill);
      expect(result.patientUuid).toBeUndefined();
      expect(result.identifier).toBeUndefined();
      expect(result.patientName).toBeUndefined();
    });

    it('Handles patient with undefined display', () => {
      const bill = createBaseBill({
        patient: {
          ...createPatient(),
          display: undefined as unknown as string,
        },
      });
      const result = mapBillProperties(bill);
      expect(result.identifier).toBeUndefined();
      expect(result.patientName).toBeUndefined();
    });
  });

  describe('Date formatting', () => {
    it('Formats dateCreated when present', () => {
      mockFormatDate.mockReturnValue('01 January 2024');
      const bill = createBaseBill({
        dateCreated: '2024-01-01T00:00:00Z',
      });
      const result = mapBillProperties(bill);
      expect(result.dateCreated).toBe('01 January 2024');
    });

    it('Returns "--" when dateCreated is null', () => {
      const bill = createBaseBill({
        dateCreated: null as unknown as string,
      });
      const result = mapBillProperties(bill);
      expect(result.dateCreated).toBe('--');
    });

    it('Returns "--" when dateCreated is undefined', () => {
      const bill = createBaseBill({
        dateCreated: undefined as unknown as string,
      });
      const result = mapBillProperties(bill);
      expect(result.dateCreated).toBe('--');
    });

    it('Returns "--" when dateCreated is empty string', () => {
      const bill = createBaseBill({
        dateCreated: '',
      });
      const result = mapBillProperties(bill);
      expect(result.dateCreated).toBe('--');
    });
  });

  describe('Billing service concatenation', () => {
    it('Concatenates multiple line item names with double space', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ item: 'Service A' }),
          createLineItem({ item: 'Service B' }),
          createLineItem({ item: 'Service C' }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.billingService).toBe('Service A  Service B  Service C');
    });

    it('Falls back to billableService when item is missing', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ item: undefined, billableService: 'Billable Service' })],
      });
      const result = mapBillProperties(bill);
      expect(result.billingService).toBe('Billable Service');
    });

    it('Falls back to "--" when both item and billableService are missing', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ item: undefined, billableService: undefined })],
      });
      const result = mapBillProperties(bill);
      expect(result.billingService).toBe('--');
    });

    it('Handles mixed item types correctly', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ item: 'Item A', billableService: 'Service A' }),
          createLineItem({ item: undefined, billableService: 'Service B' }),
          createLineItem({ item: undefined, billableService: undefined }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.billingService).toBe('Item A  Service B  --');
    });
  });

  describe('Field mapping', () => {
    it('Maps all bill fields correctly', () => {
      const bill = createBaseBill({
        id: 123,
        uuid: 'bill-uuid-123',
        receiptNumber: 'RCP-456',
        cashPoint: createCashPoint({
          uuid: 'cashpoint-uuid',
          name: 'Main Cash Point',
          location: {
            uuid: 'loc-uuid',
            display: 'Main Hospital',
            links: [],
          },
        }),
        cashier: createProvider({ uuid: 'cashier-uuid', display: 'Jane Cashier' }),
        display: 'Bill Display',
      });
      const result = mapBillProperties(bill);

      expect(result.id).toBe(123);
      expect(result.uuid).toBe('bill-uuid-123');
      expect(result.receiptNumber).toBe('RCP-456');
      expect(result.cashPointUuid).toBe('cashpoint-uuid');
      expect(result.cashPointName).toBe('Main Cash Point');
      expect(result.cashPointLocation).toBe('Main Hospital');
      expect(result.cashier).toEqual({ uuid: 'cashier-uuid', display: 'Jane Cashier', links: [] });
      expect(result.display).toBe('Bill Display');
    });

    it('Handles missing cashPoint gracefully', () => {
      const bill = createBaseBill({
        cashPoint: undefined as unknown as CashPoint,
      });
      const result = mapBillProperties(bill);
      expect(result.cashPointUuid).toBeUndefined();
      expect(result.cashPointName).toBeUndefined();
      expect(result.cashPointLocation).toBeUndefined();
    });

    it('Handles missing cashier gracefully', () => {
      const bill = createBaseBill({
        cashier: undefined as unknown as Provider,
      });
      const result = mapBillProperties(bill);
      expect(result.cashier).toBeUndefined();
    });
  });

  describe('Real-world scenarios', () => {
    it('Handles partial payment correctly', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ price: 100, quantity: 1, paymentStatus: 'PAID' }),
          createLineItem({ price: 50, quantity: 1, paymentStatus: 'PENDING' }),
        ],
        payments: [createPayment({ amountTendered: 100 })],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PENDING');
      expect(result.totalAmount).toBe(150);
      expect(result.tenderedAmount).toBe(100);
    });

    it('Handles overpayment (change due scenario)', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ price: 100, quantity: 1, paymentStatus: 'PAID' })],
        payments: [createPayment({ amount: 100, amountTendered: 150 })],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PAID');
      expect(result.totalAmount).toBe(100);
      expect(result.tenderedAmount).toBe(150);
    });

    it('Handles complex bill with mixed item states', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ paymentStatus: 'PAID', voided: false, price: 100, quantity: 1, item: 'Consultation' }),
          createLineItem({ paymentStatus: 'PENDING', voided: false, price: 50, quantity: 2, item: 'Lab Test' }),
          createLineItem({ paymentStatus: 'PAID', voided: true, price: 200, quantity: 1, item: 'Canceled X-Ray' }),
          createLineItem({
            paymentStatus: 'PAID',
            voided: false,
            price: 25,
            quantity: 3,
            item: undefined,
            billableService: 'Medication',
          }),
        ],
        payments: [createPayment({ amountTendered: 100 }), createPayment({ amountTendered: 75 })],
      });
      const result = mapBillProperties(bill);

      expect(result.status).toBe('PENDING'); // One item still pending
      expect(result.totalAmount).toBe(275); // 100 + 100 + 75 (voided item excluded)
      expect(result.tenderedAmount).toBe(175); // 100 + 75
      expect(result.lineItems).toHaveLength(3); // Only non-voided items
      expect(result.billingService).toBe('Consultation  Lab Test  Medication'); // Proper concatenation with fallback
    });

    it('Handles bill with all items voided', () => {
      const bill = createBaseBill({
        status: 'PAID',
        lineItems: [
          createLineItem({ paymentStatus: 'PENDING', voided: true }),
          createLineItem({ paymentStatus: 'PENDING', voided: true }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PAID'); // Falls back to bill.status
      expect(result.lineItems).toHaveLength(0);
      expect(result.totalAmount).toBe(0);
      expect(result.billingService).toBe(''); // No active items
    });

    it('Handles bill with no payments yet', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ price: 100, quantity: 1, paymentStatus: 'PENDING' })],
        payments: [],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PENDING');
      expect(result.totalAmount).toBe(100);
      expect(result.tenderedAmount).toBe(0);
    });

    it('Handles bill with adjusted items (quantity changes)', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ price: 50, quantity: 3, paymentStatus: 'PAID' }), // Originally 1, adjusted to 3
          createLineItem({ price: 100, quantity: 0, paymentStatus: 'PAID' }), // Adjusted to 0
        ],
        payments: [createPayment({ amountTendered: 150 })],
      });
      const result = mapBillProperties(bill);
      expect(result.status).toBe('PAID');
      expect(result.totalAmount).toBe(150); // 50*3 + 100*0
    });
  });

  describe('Edge cases for billing service', () => {
    it('Handles empty string item and billableService', () => {
      const bill = createBaseBill({
        lineItems: [createLineItem({ item: '', billableService: '' })],
      });
      const result = mapBillProperties(bill);
      expect(result.billingService).toBe('--');
    });

    it('Handles special characters in service names', () => {
      const bill = createBaseBill({
        lineItems: [
          createLineItem({ item: 'Test & Diagnosis (urgent)' }),
          createLineItem({ item: 'X-Ray: Chest/Abdomen' }),
        ],
      });
      const result = mapBillProperties(bill);
      expect(result.billingService).toBe('Test & Diagnosis (urgent)  X-Ray: Chest/Abdomen');
    });

    it('Handles very long service names', () => {
      const longServiceName = 'A'.repeat(500);
      const bill = createBaseBill({
        lineItems: [createLineItem({ item: longServiceName })],
      });
      const result = mapBillProperties(bill);
      expect(result.billingService).toBe(longServiceName);
      expect(result.billingService.length).toBe(500);
    });
  });
});
