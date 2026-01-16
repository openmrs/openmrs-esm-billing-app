import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { PaymentFormValue } from '../payments.component';
import { usePaymentModes } from '../payment.resource';
import PaymentForm from './payment-form.component';

jest.mock('../payment.resource', () => ({
  usePaymentModes: jest.fn(),
}));

const mockUsePaymentModes = jest.mocked(usePaymentModes);

type WrapperProps = {
  children: React.ReactNode;
  defaultValues?: Partial<PaymentFormValue>;
};

const Wrapper: React.FC<WrapperProps> = ({ children, defaultValues }) => {
  const methods = useForm<PaymentFormValue>({
    mode: 'all',
    defaultValues: defaultValues || { payment: [] },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('PaymentForm Component', () => {
  test('should render skeleton while loading payment modes', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [],
      isLoading: true,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={false} />
      </Wrapper>,
    );

    // When loading, payment method elements should not be present
    expect(screen.queryByText(/select payment method/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter amount/i)).not.toBeInTheDocument();
  });

  test('should render error message when payment modes fail to load', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [],
      isLoading: false,
      error: new Error('Failed to load payment modes'),
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={false} />
      </Wrapper>,
    );

    expect(screen.getByText(/error state/i)).toBeInTheDocument();
  });

  test('should append default payment when isSingleLineItem is true', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={true} />
      </Wrapper>,
    );

    const paymentMethodElements = screen.getAllByText(/payment method/i);

    expect(paymentMethodElements.length).toBeGreaterThan(0);
    expect(paymentMethodElements[0]).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();
  });

  test('should append a payment field when add payment method button is clicked', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={false} />
      </Wrapper>,
    );

    // Initially no payment fields are shown
    expect(screen.queryByPlaceholderText(/enter amount/i)).not.toBeInTheDocument();

    const addButton = screen.getByText(/add payment method/i);
    await user.click(addButton);

    // After clicking, payment fields should be visible
    expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter reference number/i)).toBeInTheDocument();
    expect(screen.getByText(/select payment method/i)).toBeInTheDocument();
  });

  test('should disable add payment button when disablePayment is true', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={true} isSingleLineItem={false} />
      </Wrapper>,
    );

    expect(screen.getByText(/add payment method/i)).toBeDisabled();
  });

  test('should remove payment field when remove button is clicked', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={false} />
      </Wrapper>,
    );

    await user.click(screen.getByText(/add payment method/i));

    const removeButton = screen.getByRole('button', { name: /remove payment method/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/enter amount/i)).not.toBeInTheDocument();
    });
  });

  test('should render amount input without leading zero', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={true} />
      </Wrapper>,
    );

    const amountInput = screen.getByPlaceholderText(/enter amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe('');
  });

  test('should allow user to clear amount input without reverting to zero', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={true} />
      </Wrapper>,
    );

    const amountInput = screen.getByPlaceholderText(/enter amount/i) as HTMLInputElement;

    await user.type(amountInput, '100');
    expect(amountInput.value).toBe('100');

    await user.clear(amountInput);
    expect(amountInput.value).toBe('');
  });

  test('should handle amount input with decimal values', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={true} />
      </Wrapper>,
    );

    const amountInput = screen.getByPlaceholderText(/enter amount/i) as HTMLInputElement;

    await user.type(amountInput, '10.50');
    expect(amountInput.value).toBe('10.5');
  });

  test('should not auto-focus reference number input on mount', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card', description: 'Credit Card', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={true} />
      </Wrapper>,
    );

    const referenceInput = screen.getByPlaceholderText(/enter reference number/i);
    expect(referenceInput).not.toHaveFocus();
  });

  test('should allow adding multiple payment methods', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [
        { uuid: '1', name: 'Cash', description: 'Cash', retired: false },
        { uuid: '2', name: 'Credit Card', description: 'Credit Card', retired: false },
      ],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={false} />
      </Wrapper>,
    );

    const addButton = screen.getByText(/add payment method/i);

    await user.click(addButton);
    await user.click(addButton);

    const amountInputs = screen.getAllByPlaceholderText(/enter amount/i);
    expect(amountInputs).toHaveLength(2);
  });

  test('should preserve entered values when adding new payment method', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Cash', description: 'Cash', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={false} />
      </Wrapper>,
    );

    const addButton = screen.getByText(/add payment method/i);
    await user.click(addButton);

    const firstAmountInput = screen.getByPlaceholderText(/enter amount/i) as HTMLInputElement;
    await user.type(firstAmountInput, '50');

    await user.click(addButton);

    const amountInputs = screen.getAllByPlaceholderText(/enter amount/i) as HTMLInputElement[];
    expect(amountInputs[0].value).toBe('50');
    expect(amountInputs[1].value).toBe('');
  });

  test('should handle removing payment method without affecting other fields', async () => {
    const user = userEvent.setup();
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Cash', description: 'Cash', retired: false }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm disablePayment={false} isSingleLineItem={false} />
      </Wrapper>,
    );

    const addButton = screen.getByText(/add payment method/i);
    await user.click(addButton);
    await user.click(addButton);

    const amountInputs = screen.getAllByPlaceholderText(/enter amount/i) as HTMLInputElement[];
    await user.type(amountInputs[0], '50');
    await user.type(amountInputs[1], '75');

    const removeButtons = screen.getAllByRole('button', { name: /remove payment method/i });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      const remainingInputs = screen.getAllByPlaceholderText(/enter amount/i) as HTMLInputElement[];
      expect(remainingInputs).toHaveLength(1);
      expect(remainingInputs[0].value).toBe('75');
    });
  });
});
