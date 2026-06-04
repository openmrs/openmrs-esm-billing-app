import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSession, useConfig } from '@openmrs/esm-framework';
import DiscountsTable from './discounts-table.component';
import { BillDiscountStatus, BillDiscountType, type BillDiscount, type MappedBill } from '../types';

vi.mock('@openmrs/esm-framework', () => ({
  useSession: vi.fn(),
  useConfig: vi.fn(),
  useLayoutType: () => 'desktop',
  isDesktop: () => true,
  formatDate: (d: Date) => d.toISOString(),
  parseDate: (s: string) => new Date(s),
  showModal: vi.fn(),
  showSnackbar: vi.fn(),
  restBaseUrl: '/ws/rest/v1',
}));
window.i18next = { language: 'en-US' } as any;

const mockDiscount = (overrides: Partial<BillDiscount> = {}) => ({
  uuid: 'd1',
  billUuid: 'b1',
  lineItemUuid: null,
  discountType: BillDiscountType.PERCENTAGE,
  discountValue: 10,
  discountAmount: 500,
  justification: 'returning patient',
  initiator: { uuid: 'u-cashier', display: 'cashier-alex' },
  approver: null,
  dateCreated: '2026-05-11T00:00:00.000+0000',
  status: BillDiscountStatus.PENDING,
  voided: false,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue({ user: { uuid: 'u-cashier' } } as any);
  vi.mocked(useConfig).mockReturnValue({ defaultCurrency: 'USD' } as any);
});

const makeBill = (discounts: BillDiscount[] = []): MappedBill =>
  ({ uuid: 'b1', lineItems: [{ uuid: 'li1', item: 'Consultation' }], discounts }) as unknown as MappedBill;

describe('DiscountsTable', () => {
  it('returns null when no non-voided discounts exist', () => {
    const { container } = render(<DiscountsTable bill={makeBill([])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when all discounts are voided', () => {
    const { container } = render(<DiscountsTable bill={makeBill([mockDiscount({ voided: true })])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one row per discount with status tag', () => {
    render(
      <DiscountsTable
        bill={makeBill([mockDiscount({ status: BillDiscountStatus.APPROVED }), mockDiscount({ uuid: 'd2' })])}
      />,
    );

    expect(screen.getByText(/Approved/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });
});
