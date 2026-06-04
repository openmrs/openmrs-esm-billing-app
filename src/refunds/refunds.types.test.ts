import { describe, expect, it } from 'vitest';
import { BillStatus, RefundStatus } from '../types';

describe('RefundStatus', () => {
  it('exports all four statuses', () => {
    expect(RefundStatus.REQUESTED).toBe('REQUESTED');
    expect(RefundStatus.APPROVED).toBe('APPROVED');
    expect(RefundStatus.REJECTED).toBe('REJECTED');
    expect(RefundStatus.COMPLETED).toBe('COMPLETED');
  });

  it('BillStatus includes PARTIALLY_REFUNDED', () => {
    expect(BillStatus.PARTIALLY_REFUNDED).toBe('PARTIALLY_REFUNDED');
  });
});
