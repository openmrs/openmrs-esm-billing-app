import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showModal } from '@openmrs/esm-framework';
import RefundRequests from './refund-requests.component';
import { useRefundRequests } from '../refunds.resource';
import { RefundStatus } from '../../types';

vi.mock('@openmrs/esm-framework', () => ({
  showModal: vi.fn(),
  useConfig: () => ({ defaultCurrency: 'USD', pageSize: 10 }),
  formatDate: () => 'date',
  parseDate: (s: string) => new Date(s),
  restBaseUrl: '/ws/rest/v1',
  useLayoutType: () => 'small-desktop',
  isDesktop: () => true,
  usePagination: <T,>(items: T[]) => ({
    paginated: (items?.length ?? 0) > 10,
    goTo: vi.fn(),
    results: items ?? [],
    currentPage: 1,
  }),
  usePaginationInfo: () => ({ pageSizes: [10, 20, 30, 40, 50] }),
  EmptyCardIllustration: () => null,
  ErrorState: ({ headerTitle }: { headerTitle: string }) => <div>{headerTitle} error</div>,
}));

globalThis.i18next = { language: 'en-US' } as any;
vi.mock('../refunds.resource');

const sampleBill = {
  uuid: 'b1',
  receiptNumber: 'INV-1',
  status: 'PAID',
  total: 5000,
  amountAfterDiscount: 5000,
  dateCreated: '2026-05-21T00:00:00.000+0000',
  patient: { display: '10001V - Jane Doe' },
  cashier: { display: 'cashier' },
  refunds: [{ uuid: 'r1', status: RefundStatus.REQUESTED, voided: false }],
};

beforeEach(() => vi.clearAllMocks());

describe('RefundRequests page', () => {
  it('renders empty state when no bills match', () => {
    vi.mocked(useRefundRequests).mockReturnValue({
      bills: [],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    render(<RefundRequests />);
    expect(screen.getByText(/no refund requests to display/i)).toBeInTheDocument();
  });

  it('lists one row per bill', () => {
    vi.mocked(useRefundRequests).mockReturnValue({
      bills: [sampleBill],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    render(<RefundRequests />);
    expect(screen.getByText(/INV-1/)).toBeInTheDocument();
    expect(screen.getByText(/10001V - Jane Doe/)).toBeInTheDocument();
  });

  it('opens review modal on row click', async () => {
    vi.mocked(useRefundRequests).mockReturnValue({
      bills: [sampleBill],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    const user = userEvent.setup();
    render(<RefundRequests />);
    await user.click(screen.getByText(/INV-1/));
    expect(showModal).toHaveBeenCalledWith(
      'review-bill-refunds-modal',
      expect.objectContaining({ bill: expect.objectContaining({ uuid: 'b1' }) }),
    );
  });

  it('changes status filter', async () => {
    vi.mocked(useRefundRequests).mockReturnValue({
      bills: [],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    const user = userEvent.setup();
    render(<RefundRequests />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText(/approved/i));
    expect(vi.mocked(useRefundRequests).mock.calls.at(-1)?.[0].statuses).toEqual([RefundStatus.APPROVED]);
  });
});
