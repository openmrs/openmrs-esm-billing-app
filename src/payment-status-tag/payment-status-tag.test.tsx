import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePatientPaymentStatus } from '../billing.resource';
import PaymentStatusTag from './payment-status-tag.component';

const mockUsePatientPaymentStatus = vi.mocked(usePatientPaymentStatus);

vi.mock('../billing.resource', () => ({
  usePatientPaymentStatus: vi.fn(),
  useStockItems: vi.fn(),
}));

const patientUuid = 'test-patient-uuid';

describe('PaymentStatusTag', () => {
  it('renders nothing while loading', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: undefined,
      isLoading: true,
      error: undefined,
      isValidating: false,
      mutate: vi.fn(),
    });
    const { container } = render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-chart" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is an error', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: undefined,
      isLoading: false,
      error: new Error('fetch failed'),
      isValidating: false,
      mutate: vi.fn(),
    });
    const { container } = render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-chart" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when paymentStatus is undefined', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: undefined,
      isLoading: false,
      error: undefined,
      isValidating: false,
      mutate: vi.fn(),
    });
    const { container } = render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-chart" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for UNKNOWN status', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: { status: 'UNKNOWN', reason: 'Status could not be determined' },
      isLoading: false,
      error: undefined,
      isValidating: false,
      mutate: vi.fn(),
    });
    const { container } = render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-chart" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when not in patient-chart status', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: { status: 'PAID', reason: 'Status could not be determined' },
      isLoading: false,
      error: undefined,
      isValidating: false,
      mutate: vi.fn(),
    });
    const { container } = render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-search" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a PAID tag with the reason in the tooltip content', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: { status: 'PAID', reason: 'Bill fully settled' },
      isLoading: false,
      error: undefined,
      isValidating: false,
      mutate: vi.fn(),
    });
    render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-chart" />);
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('Bill fully settled')).toBeInTheDocument();
  });

  it('renders an UNPAID tag with the reason in the tooltip content', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: { status: 'UNPAID', reason: 'Outstanding balance of 500' },
      isLoading: false,
      error: undefined,
      isValidating: false,
      mutate: vi.fn(),
    });
    render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-chart" />);
    expect(screen.getByText('UNPAID')).toBeInTheDocument();
    expect(screen.getByText('Outstanding balance of 500')).toBeInTheDocument();
  });

  it('does not blink on revalidation — renders stale value while isValidating is true', () => {
    mockUsePatientPaymentStatus.mockReturnValue({
      paymentStatus: { status: 'PAID', reason: 'Fully paid' },
      isLoading: false,
      error: undefined,
      isValidating: true,
      mutate: vi.fn(),
    });
    render(<PaymentStatusTag patientUuid={patientUuid} renderedFrom="patient-chart" />);
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });
});
