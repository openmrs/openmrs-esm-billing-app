import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { PaymentFormValue } from '../payments.component';
import { usePaymentModes } from '../payment.resource';
import PaymentForm from './payment-form.component';

vi.mock('../payment.resource', () => ({
  usePaymentModes: vi.fn(),
}));

const mockUsePaymentModes = vi.mocked(usePaymentModes);

type WrapperProps = {
  children: React.ReactNode;
  defaultValues?: Partial<PaymentFormValue>;
};

const Wrapper: React.FC<WrapperProps> = ({ children, defaultValues }) => {
  const methods = useForm<PaymentFormValue>({
    mode: 'all',
    defaultValues: defaultValues || { payment: { method: '', amount: undefined, referenceCode: '' } },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('PaymentForm Component', () => {
  it('should render skeleton while loading payment modes', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [],
      isLoading: true,
      error: null,
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} />
      </Wrapper>,
    );

    // When loading, payment method elements should not be present
    expect(screen.queryByText(/select payment method/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter amount/i)).not.toBeInTheDocument();
  });

  it('should render error message when payment modes fail to load', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [],
      isLoading: false,
      error: new Error('Failed to load payment modes'),
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} />
      </Wrapper>,
    );

    expect(screen.getByText(/error state/i)).toBeInTheDocument();
  });

  it('should render payment form with method, amount and reference fields when not disabled', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} />
      </Wrapper>,
    );

    expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter reference number/i)).toBeInTheDocument();
    expect(screen.getByText(/select payment method/i)).toBeInTheDocument();
  });

  it('should not render form when disablePayment is true', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={true} />
      </Wrapper>,
    );

    expect(screen.queryByPlaceholderText(/enter amount/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/add payment method/i)).not.toBeInTheDocument();
  });

  it('should render amount input without leading zero', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} />
      </Wrapper>,
    );

    const amountInput = screen.getByPlaceholderText(/enter amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe('');
  });

  it('should allow user to clear amount input without reverting to zero', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} />
      </Wrapper>,
    );

    const amountInput = screen.getByPlaceholderText(/enter amount/i) as HTMLInputElement;

    await user.type(amountInput, '100');
    expect(amountInput.value).toBe('100');

    await user.clear(amountInput);
    expect(amountInput.value).toBe('');
  });

  it('should handle amount input with decimal values', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} />
      </Wrapper>,
    );

    const amountInput = screen.getByPlaceholderText(/enter amount/i) as HTMLInputElement;

    await user.type(amountInput, '10.50');
    expect(amountInput.value).toBe('10.5');
  });

  it('should not auto-focus reference number input on mount', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} />
      </Wrapper>,
    );

    const referenceInput = screen.getByPlaceholderText(/enter reference number/i);
    expect(referenceInput).not.toHaveFocus();
  });
});
