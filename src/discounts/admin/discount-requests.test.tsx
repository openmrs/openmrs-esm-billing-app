import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showModal } from '@openmrs/esm-framework';
import DiscountRequests from './discount-requests.component';
import { useDiscountRequests } from '../discounts.resource';
import { BillDiscountStatus } from '../../types';

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

(window as any).i18next = { language: 'en-US' };
vi.mock('../discounts.resource');

const sampleBill = {
  uuid: 'b1',
  receiptNumber: 'INV-1',
  status: 'POSTED',
  total: 5000,
  amountAfterDiscount: 5000,
  dateCreated: '2026-05-11T00:00:00.000+0000',
  patient: { display: '10001V - Jane Doe' },
  cashier: { display: 'cashier' },
  discounts: [{ uuid: 'd1', status: BillDiscountStatus.PENDING, voided: false }],
};

beforeEach(() => vi.clearAllMocks());

describe('DiscountRequests page', () => {
  it('renders an empty state when no bills match', () => {
    vi.mocked(useDiscountRequests).mockReturnValue({
      bills: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    render(<DiscountRequests />);
    expect(screen.getByText(/no discount requests to display/i)).toBeInTheDocument();
  });

  it('lists one row per bill with the bill metadata', () => {
    vi.mocked(useDiscountRequests).mockReturnValue({
      bills: [sampleBill],
      totalCount: 1,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    render(<DiscountRequests />);
    expect(screen.getByText(/INV-1/)).toBeInTheDocument();
    expect(screen.getByText(/10001V - Jane Doe/)).toBeInTheDocument();
  });

  it('opens the review modal on row click', async () => {
    vi.mocked(useDiscountRequests).mockReturnValue({
      bills: [sampleBill],
      totalCount: 1,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    const user = userEvent.setup();
    render(<DiscountRequests />);
    await user.click(screen.getByText(/INV-1/));
    expect(showModal).toHaveBeenCalledWith(
      'review-bill-discounts-modal',
      expect.objectContaining({ bill: expect.objectContaining({ uuid: 'b1' }) }),
    );
  });

  it('changes the status filter and refetches', async () => {
    const mutate = vi.fn();
    vi.mocked(useDiscountRequests).mockReturnValue({
      bills: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      mutate,
    } as any);
    const user = userEvent.setup();
    render(<DiscountRequests />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText(/approved/i));
    expect(vi.mocked(useDiscountRequests).mock.calls.at(-1)?.[0].statuses).toEqual([BillDiscountStatus.APPROVED]);
  });
});
