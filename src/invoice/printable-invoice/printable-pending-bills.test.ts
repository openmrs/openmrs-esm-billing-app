import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import type { BillingConfig } from '../../config-schema';
import { BillStatus, type MappedBill } from '../../types';
import PrintablePendingBills, { combinePendingBills } from './printable-pending-bills.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);

const createBill = (overrides: Partial<MappedBill> = {}): MappedBill =>
  ({
    uuid: 'bill-1',
    id: 1,
    patientUuid: 'patient-1',
    patientName: 'NABAKOZA ANGEL',
    cashPointUuid: 'cash-point-1',
    cashPointName: 'Main',
    cashPointLocation: 'Reception',
    cashier: null,
    receiptNumber: '10836-5',
    status: BillStatus.PENDING,
    identifier: 'patient-identifier',
    dateCreated: '2026-09-16T09:00:00.000Z',
    lineItems: [{ uuid: 'line-1', item: 'Consultation', quantity: 1, price: 1000, status: 'PENDING' }],
    billingService: 'Consultation',
    payments: [],
    totalAmount: 1000,
    netAmount: 900,
    tenderedAmount: 100,
    ...overrides,
  }) as MappedBill;

describe('combinePendingBills', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      logo: { src: '', alt: '' },
      country: 'Uganda',
      defaultCurrency: 'UGX',
    } as unknown as BillingConfig);
  });

  it('combines invoice numbers, line items, payments, and totals', () => {
    const payment = {
      uuid: 'payment-1',
      instanceType: { uuid: 'cash', name: 'Cash', description: '', retired: false },
      attributes: [],
      amount: 200,
      amountTendered: 200,
      dateCreated: Date.now(),
      voided: false,
      resourceVersion: '1.0',
    };
    const bills = [
      createBill(),
      createBill({
        uuid: 'bill-2',
        receiptNumber: '10835-7',
        dateCreated: '2026-09-18T09:00:00.000Z',
        lineItems: [{ uuid: 'line-2', item: 'Laboratory', quantity: 2, price: 500, status: 'PENDING' }],
        payments: [payment],
        totalAmount: 1000,
        netAmount: 1000,
        tenderedAmount: 200,
      }),
    ];

    const combinedBill = combinePendingBills(bills);

    expect(combinedBill).toMatchObject({
      receiptNumber: '10836-5, 10835-7',
      status: BillStatus.PENDING,
      totalAmount: 2000,
      netAmount: 1900,
      tenderedAmount: 300,
      dateCreated: '',
    });
    expect(combinedBill?.lineItems).toHaveLength(2);
    expect(combinedBill?.payments).toEqual([payment]);
  });

  it('returns null when there are no pending bills', () => {
    expect(combinePendingBills([])).toBeNull();
  });

  it('renders the real combined document with every invoice reference and line item', () => {
    const bills = [
      createBill(),
      createBill({
        uuid: 'bill-2',
        receiptNumber: '10835-7',
        dateCreated: '2026-09-18T09:00:00.000Z',
        lineItems: [{ uuid: 'line-2', item: 'Laboratory', quantity: 2, price: 500, status: 'PENDING' }],
      }),
    ];
    const patient = {
      name: [{ given: ['Jane'], family: 'Doe' }],
      gender: 'female',
    } as fhir.Patient;

    render(
      React.createElement(PrintablePendingBills, {
        bills,
        patient,
        componentRef: React.createRef<HTMLDivElement>(),
        defaultFacility: { uuid: 'facility-1', display: 'Kagadi Hospital', links: [] },
      }),
    );

    expect(screen.getByText(': 10836-5')).toBeInTheDocument();
    expect(screen.getByText(': 16 — Sept — 2026')).toBeInTheDocument();
    expect(screen.getByText(': 10835-7')).toBeInTheDocument();
    expect(screen.getByText(': 18 — Sept — 2026')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Consultation' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Laboratory' })).toBeInTheDocument();
  });
});
