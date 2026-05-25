import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession, useConfig } from '@openmrs/esm-framework';
import RefundsTable from './refunds-table.component';
import { actOnRefund } from './refunds.resource';
import { RefundStatus, type MappedBill } from '../types';

vi.mock('@openmrs/esm-framework', () => ({
  useSession: vi.fn(),
  useConfig: vi.fn(),
  useLayoutType: () => 'desktop',
  isDesktop: () => true,
  showSnackbar: vi.fn(),
  restBaseUrl: '/ws/rest/v1',
}));
vi.mock('./refunds.resource');

globalThis.i18next = { language: 'en-US' } as any;

const mockRefund = (overrides = {}) => ({
  uuid: 'r1',
  billUuid: 'b1',
  lineItemUuid: null,
  refundAmount: 500,
  reason: 'overcharged',
  initiator: { uuid: 'u1', display: 'cashier' },
  approver: null,
  completer: null,
  dateApproved: null,
  dateCompleted: null,
  dateCreated: '2026-05-21T00:00:00.000+0000',
  status: RefundStatus.REQUESTED,
  voided: false,
  ...overrides,
});

const makeBill = (refunds: any[] = []): MappedBill => ({ uuid: 'b1', lineItems: [], refunds }) as unknown as MappedBill;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue({ user: { uuid: 'u-cashier' } } as any);
  vi.mocked(useConfig).mockReturnValue({ defaultCurrency: 'USD' } as any);
});

describe('RefundsTable', () => {
  it('returns null when bill has no refunds', () => {
    const { container } = render(<RefundsTable bill={makeBill([])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders rows for each refund', () => {
    render(<RefundsTable bill={makeBill([mockRefund(), mockRefund({ uuid: 'r2', status: RefundStatus.APPROVED })])} />);
    expect(screen.getByText(/requested/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  it('enables the "Process refund" button only for APPROVED non-voided rows', () => {
    render(
      <RefundsTable
        bill={makeBill([
          mockRefund({ uuid: 'r1', status: RefundStatus.REQUESTED }),
          mockRefund({ uuid: 'r2', status: RefundStatus.APPROVED }),
        ])}
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /process refund/i });
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
  });

  it('calls actOnRefund with COMPLETED status on process click', async () => {
    const onMutate = vi.fn();
    vi.mocked(actOnRefund).mockResolvedValue({} as any);
    const user = userEvent.setup();
    render(
      <RefundsTable bill={makeBill([mockRefund({ uuid: 'r2', status: RefundStatus.APPROVED })])} onMutate={onMutate} />,
    );
    await user.click(screen.getByRole('button', { name: /process refund/i }));
    await waitFor(() =>
      expect(actOnRefund).toHaveBeenCalledWith('r2', { status: RefundStatus.COMPLETED, completer: 'u-cashier' }),
    );
    expect(onMutate).toHaveBeenCalled();
  });

  // Finding 3: null session.user must not crash handleProcess
  it('passes undefined as completer and does not throw when session.user is null', async () => {
    vi.mocked(useSession).mockReturnValue({ user: null } as any);
    vi.mocked(actOnRefund).mockResolvedValue({} as any);
    const user = userEvent.setup();
    render(<RefundsTable bill={makeBill([mockRefund({ uuid: 'r2', status: RefundStatus.APPROVED })])} />);
    await user.click(screen.getByRole('button', { name: /process refund/i }));
    await waitFor(() =>
      expect(actOnRefund).toHaveBeenCalledWith('r2', { status: RefundStatus.COMPLETED, completer: undefined }),
    );
  });

  // Finding 5: voided APPROVED refunds must not appear in the table
  it('does not render a row or process button for voided APPROVED refunds', () => {
    render(<RefundsTable bill={makeBill([mockRefund({ uuid: 'r3', status: RefundStatus.APPROVED, voided: true })])} />);
    expect(screen.queryByRole('button', { name: /process refund/i })).not.toBeInTheDocument();
  });
});
