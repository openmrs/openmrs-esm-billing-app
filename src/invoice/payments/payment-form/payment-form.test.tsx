import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { PaymentFormValue } from '../payments.component';
import PaymentForm from './payment-form.component';

jest.mock('../payment.resource', () => ({
  usePaymentModes: jest.fn(),
}));

const { usePaymentModes } = jest.requireMock('../payment.resource');

type WrapperProps = {
  children: React.ReactNode;
};

const Wrapper: React.FC<WrapperProps> = ({ children }) => {
  const methods = useForm<PaymentFormValue>();
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('PaymentForm Component', () => {
  test('should render skeleton while loading payment modes', () => {
    usePaymentModes.mockReturnValue({
      paymentModes: [],
      isLoading: true,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm
          disablePayment={false}
          clientBalance={100}
          isSingleLineItemSelected={false}
          isSingleLineItem={false}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId('number-input-skeleton')).toBeInTheDocument();
  });

  test('should render error message when payment modes fail to load', () => {
    usePaymentModes.mockReturnValue({
      paymentModes: [],
      isLoading: false,
      error: new Error('Failed to load payment modes'),
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm
          disablePayment={false}
          clientBalance={100}
          isSingleLineItemSelected={false}
          isSingleLineItem={false}
        />
      </Wrapper>,
    );

    expect(screen.getByText(/payment modes error/i)).toBeInTheDocument();
  });

  test('should append default payment when isSingleLineItem is true', () => {
    usePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card' }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm
          disablePayment={false}
          clientBalance={100}
          isSingleLineItemSelected={false}
          isSingleLineItem={true}
        />
      </Wrapper>,
    );

    const paymentMethodElements = screen.getAllByText(/payment method/i);

    expect(paymentMethodElements.length).toBeGreaterThan(0);
    expect(paymentMethodElements[0]).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/enter amount/i)).toBeInTheDocument();
  });

  test('should append a payment field when add payment option button is clicked', async () => {
    const user = userEvent.setup();
    usePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card' }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm
          disablePayment={false}
          clientBalance={100}
          isSingleLineItemSelected={true}
          isSingleLineItem={false}
        />
      </Wrapper>,
    );

    const addButton = screen.getByText(/add payment option/i);
    await user.click(addButton);
    const paymentMethodElements = screen.getAllByLabelText(/payment method/i);
    expect(paymentMethodElements).toHaveLength(2);
  });

  test('should disable add payment button when disablePayment is true', () => {
    usePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card' }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm
          disablePayment={true}
          clientBalance={100}
          isSingleLineItemSelected={true}
          isSingleLineItem={false}
        />
      </Wrapper>,
    );

    expect(screen.getByText(/add payment option/i)).toBeDisabled();
  });

  test('should remove payment field when trash can icon is clicked', async () => {
    const user = userEvent.setup();
    usePaymentModes.mockReturnValue({
      paymentModes: [{ uuid: '1', name: 'Credit Card' }],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
    });

    render(
      <Wrapper>
        <PaymentForm
          disablePayment={false}
          clientBalance={100}
          isSingleLineItemSelected={true}
          isSingleLineItem={false}
        />
      </Wrapper>,
    );

    await user.click(screen.getByText(/add payment option/i));

    const trashCanIcon = screen.getByTestId('trash-can-icon');
    await user.click(trashCanIcon);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/enter amount/i)).not.toBeInTheDocument();
    });
  });
});
