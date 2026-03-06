import React from 'react';
import { render, screen } from '@testing-library/react';
import { useBills } from '../billing.resource';
import { type MappedBill } from '../types';
import PaymentStatusTag from './payment-status-tag.extension';

jest.mock('../billing.resource', () => ({
  useBills: jest.fn(),
}));

const mockUseBills = jest.mocked<typeof useBills>(useBills);

const makeBill = (overrides: Partial<MappedBill>): MappedBill =>
  ({
    status: 'PENDING',
    ...overrides,
  }) as MappedBill;

const mockBillsReturn = (bills: Partial<MappedBill>[]) =>
  mockUseBills.mockReturnValue({
    bills: bills as unknown as MappedBill[],
    isLoading: false,
    isValidating: false,
    error: null,
    mutate: jest.fn(),
  });

describe('payment status tag', () => {
  it('does not render a payment status tag in the patient banner for patients without bills', () => {
    mockBillsReturn([]);
    render(<PaymentStatusTag patientUuid="patient-uuid" />);
    expect(screen.queryByText('Payment status : Paid')).not.toBeInTheDocument();
  });

  it('renders a payment status tag with "Paid" status in the patient banner for patients with all paid bills', () => {
    mockBillsReturn([makeBill({ status: 'PAID' }), makeBill({ status: 'PAID' })]);
    render(<PaymentStatusTag patientUuid="patient-uuid" />);
    expect(screen.getByText('Payment status : Paid')).toBeInTheDocument();
  });

  it('renders a payment status tag with "Pending" status in the patient banner for patients with all Pending bills', () => {
    mockBillsReturn([makeBill({ status: 'PENDING' }), makeBill({ status: 'PENDING' })]);
    render(<PaymentStatusTag patientUuid="patient-uuid" />);
    expect(screen.getByText('Payment status : Pending')).toBeInTheDocument();
  });

  it('renders a payment status tag with "Partially Paid" status in the patient banner for patients with all posted bills', () => {
    mockBillsReturn([makeBill({ status: 'POSTED' }), makeBill({ status: 'POSTED' })]);
    render(<PaymentStatusTag patientUuid="patient-uuid" />);
    expect(screen.getByText('Payment status : Partially Paid')).toBeInTheDocument();
  });

  it('renders a payment status tag with "Partially Paid" status in the patient banner for patients with all mix pending ,paid,posted bills', () => {
    mockBillsReturn([makeBill({ status: 'PENDING' }), makeBill({ status: 'PAID' }), makeBill({ status: 'POSTED' })]);
    render(<PaymentStatusTag patientUuid="patient-uuid" />);
    expect(screen.getByText('Payment status : Partially Paid')).toBeInTheDocument();
  });
  it('doesnot renders a payment status tag with "Paid" status in the patient banner for patients with posted and pending bills', () => {
    mockBillsReturn([makeBill({ status: 'PENDING' }), makeBill({ status: 'PAID' }), makeBill({ status: 'POSTED' })]);
    render(<PaymentStatusTag patientUuid="patient-uuid" />);
    expect(screen.queryByText('Payment status : Paid')).not.toBeInTheDocument();
  });
  it('doesnot renders a payment status tag with "Pending" status in the patient banner for patients with posted and paid bills', () => {
    mockBillsReturn([makeBill({ status: 'PENDING' }), makeBill({ status: 'PAID' }), makeBill({ status: 'POSTED' })]);
    render(<PaymentStatusTag patientUuid="patient-uuid" />);
    expect(screen.queryByText('Payment status : Pending')).not.toBeInTheDocument();
  });
});
