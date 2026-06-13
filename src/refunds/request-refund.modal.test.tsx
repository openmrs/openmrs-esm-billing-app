import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import RequestRefundModal from './request-refund.modal';
import { requestRefund } from './refunds.resource';

vi.mock('@openmrs/esm-framework', () => ({
  showSnackbar: vi.fn(),
  useConfig: vi.fn().mockReturnValue({ defaultCurrency: 'USD' }),
  getCoreTranslation: (key: string) => key,
  restBaseUrl: '/ws/rest/v1',
}));
vi.mock('./refunds.resource');

globalThis.i18next = { language: 'en-US' } as any;

const closeModal = vi.fn();
const onMutate = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('RequestRefundModal', () => {
  it('blocks submit when reason is empty', () => {
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000, receiptNumber: 'INV-1' }}
        remainingRefundable={5000}
        onMutate={onMutate}
      />,
    );
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
  });

  it('shows a clear message when no refundable amount remains', async () => {
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000 }}
        remainingRefundable={0}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '1');
    expect(screen.getByText(/no refundable amount remaining/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
  });

  it('blocks submit when amount exceeds remainingRefundable', async () => {
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000 }}
        remainingRefundable={300}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '500');
    await user.type(screen.getByLabelText(/reason/i), 'overcharged');
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
    expect(screen.getByText(/cannot exceed/i)).toBeInTheDocument();
  });

  it('submits a valid request and closes', async () => {
    vi.mocked(requestRefund).mockResolvedValue({ uuid: 'r-new' } as any);
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000 }}
        remainingRefundable={5000}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '500');
    await user.type(screen.getByLabelText(/reason/i), 'overcharged');
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() =>
      expect(requestRefund).toHaveBeenCalledWith({
        bill: 'b1',
        refundAmount: 500,
        reason: 'overcharged',
      }),
    );
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(onMutate).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('submits with lineItem uuid when lineItem prop is provided', async () => {
    vi.mocked(requestRefund).mockResolvedValue({ uuid: 'r-new' } as any);
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000 }}
        lineItem={{ uuid: 'li1', display: 'Consultation', total: 1000 }}
        remainingRefundable={1000}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '200');
    await user.type(screen.getByLabelText(/reason/i), 'duplicate charge');
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() =>
      expect(requestRefund).toHaveBeenCalledWith(
        expect.objectContaining({ bill: 'b1', lineItem: 'li1', refundAmount: 200 }),
      ),
    );
  });

  it('shows already-refunded row when prior refunds exist on a discounted bill', async () => {
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        // bill.total=200, discount=50 → amountAfterDiscount=150, prior refund=40 → remainingRefundable=110
        bill={{ uuid: 'b1', total: 200, amountAfterDiscount: 150 }}
        remainingRefundable={110}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '30');

    expect(screen.getByText(/already refunded/i)).toBeInTheDocument();
    // summary shows amountAfterDiscount (150) as bill total, prior refund (40), and remainder (80)
    expect(screen.getByText(/\$150/)).toBeInTheDocument();
    expect(screen.getByText(/\$80/)).toBeInTheDocument();
  });

  it('hides already-refunded row when there are no prior refunds', async () => {
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 200, amountAfterDiscount: 150 }}
        remainingRefundable={150}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '30');

    expect(screen.queryByText(/already refunded/i)).not.toBeInTheDocument();
  });

  it('shows already-refunded row for a line item with a prior completed refund', async () => {
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000 }}
        // line total=100, completed refund=20 → remainingRefundable=80
        lineItem={{ uuid: 'li1', display: 'Lab Test', total: 100 }}
        remainingRefundable={80}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '50');

    expect(screen.getByText(/already refunded/i)).toBeInTheDocument();
    // amount after refund: remainingRefundable − amount = 80 − 50 = 30
    expect(screen.getByText(/\$30/)).toBeInTheDocument();
  });

  it('hides already-refunded row for a line item with no prior refunds', async () => {
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000 }}
        lineItem={{ uuid: 'li1', display: 'Lab Test', total: 100 }}
        remainingRefundable={100}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '50');

    expect(screen.queryByText(/already refunded/i)).not.toBeInTheDocument();
  });

  it('shows an error snackbar and keeps modal open on failure', async () => {
    vi.mocked(requestRefund).mockRejectedValue({
      responseBody: { error: { message: 'billing.error.refund.exceedsTotal' } },
    });
    const user = userEvent.setup();
    render(
      <RequestRefundModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 5000, amountAfterDiscount: 5000 }}
        remainingRefundable={5000}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/amount/i), '100');
    await user.type(screen.getByLabelText(/reason/i), 'x');
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));
    expect(closeModal).not.toHaveBeenCalled();
  });
});
