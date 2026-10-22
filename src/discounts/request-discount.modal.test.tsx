import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import RequestDiscountModal from './request-discount.modal';
import { requestDiscount } from './discounts.resource';
import { BillDiscountType } from '../types';

vi.mock('@openmrs/esm-framework', () => ({
  showSnackbar: vi.fn(),
  useConfig: vi.fn().mockReturnValue({ defaultCurrency: 'USD' }),
  getCoreTranslation: (key: string) => key,
  restBaseUrl: '/ws/rest/v1',
}));
vi.mock('./discounts.resource');

(window as any).i18next = { language: 'en-US' };

const closeModal = vi.fn();
const onMutate = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('RequestDiscountModal', () => {
  it('blocks submit when justification is empty', async () => {
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 1000 }}
        onMutate={onMutate}
      />,
    );
    const submit = screen.getByRole('button', { name: /submit request/i });
    expect(submit).toBeDisabled();
  });

  it('rejects percentage value greater than 100', async () => {
    const user = userEvent.setup();
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 1000 }}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/value/i), '150');
    await user.type(screen.getByLabelText(/justification/i), 'reason');
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
    expect(screen.getByText(/cannot exceed 100/i)).toBeInTheDocument();
  });

  it('flags a fixed-amount discount that exceeds the amount due', async () => {
    const user = userEvent.setup();
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 1000 }}
        onMutate={onMutate}
      />,
    );
    await user.click(screen.getByRole('radio', { name: /fixed amount/i }));
    await user.type(screen.getByLabelText(/value/i), '2000');
    await user.type(screen.getByLabelText(/justification/i), 'reason');
    expect(screen.getByText(/cannot exceed the amount due/i)).toBeInTheDocument();
  });

  it('flags a percentage whose computed discount exceeds amount due on a partially-paid bill', async () => {
    const user = userEvent.setup();
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 200 }}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/value/i), '50');
    await user.type(screen.getByLabelText(/justification/i), 'reason');
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
    expect(screen.getByText(/cannot exceed the amount due/i)).toBeInTheDocument();
  });

  it('flags a fixed-amount discount that exceeds the line item total', async () => {
    const user = userEvent.setup();
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 1000 }}
        lineItem={{ uuid: 'li1', display: 'Consultation', total: 200 }}
        onMutate={onMutate}
      />,
    );
    await user.click(screen.getByRole('radio', { name: /fixed amount/i }));
    await user.type(screen.getByLabelText(/value/i), '300');
    await user.type(screen.getByLabelText(/justification/i), 'reason');
    expect(screen.getByText(/cannot exceed the line item total/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
  });

  it('flags a fixed-amount discount that would push the bill amount due negative on a partially-paid bill', async () => {
    const user = userEvent.setup();
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 300 }}
        onMutate={onMutate}
      />,
    );
    await user.click(screen.getByRole('radio', { name: /fixed amount/i }));
    // 500 <= bill.total (1000), but > amountDue (300) → would make amountDue negative.
    await user.type(screen.getByLabelText(/value/i), '500');
    await user.type(screen.getByLabelText(/justification/i), 'reason');
    expect(screen.getByText(/cannot exceed the amount due/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit request/i })).toBeDisabled();
  });

  it('submits a valid request and closes', async () => {
    vi.mocked(requestDiscount).mockResolvedValue({ uuid: 'new-d' } as any);
    const user = userEvent.setup();
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 1000 }}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/value/i), '10');
    await user.type(screen.getByLabelText(/justification/i), 'returning patient');
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() =>
      expect(requestDiscount).toHaveBeenCalledWith({
        bill: 'b1',
        discountType: BillDiscountType.PERCENTAGE,
        discountValue: 10,
        justification: 'returning patient',
      }),
    );
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(onMutate).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('shows an error snackbar and keeps the modal open when submission fails', async () => {
    vi.mocked(requestDiscount).mockRejectedValue({
      responseBody: { error: { message: 'billing.error.discount.scopeConflict' } },
    });
    const user = userEvent.setup();
    render(
      <RequestDiscountModal
        closeModal={closeModal}
        bill={{ uuid: 'b1', total: 1000, amountDue: 1000 }}
        onMutate={onMutate}
      />,
    );
    await user.type(screen.getByLabelText(/value/i), '10');
    await user.type(screen.getByLabelText(/justification/i), 'x');
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'error' })));
    expect(closeModal).not.toHaveBeenCalled();
  });
});
