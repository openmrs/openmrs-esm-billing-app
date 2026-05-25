import { describe, expect, it, vi, beforeEach } from 'vitest';
import useSWR from 'swr';
import { openmrsFetch } from '@openmrs/esm-framework';
import { renderHook } from '@testing-library/react';
import { useBillRefunds, requestRefund, actOnRefund, voidRefund } from './refunds.resource';
import type { BillRefund } from '../types';
import { RefundStatus } from '../types';

vi.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: vi.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

vi.mock('swr');
const mockUseSWR = vi.mocked(useSWR);

beforeEach(() => vi.clearAllMocks());

describe('useBillRefunds', () => {
  it('returns empty array when billUuid is undefined', () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: null, mutate: vi.fn() } as any);
    const { result } = renderHook(() => useBillRefunds(undefined));
    expect(result.current.refunds).toEqual([]);
  });

  it('filters out voided refunds', () => {
    mockUseSWR.mockReturnValue({
      data: {
        data: {
          results: [
            { uuid: 'r1', voided: false, status: RefundStatus.REQUESTED },
            { uuid: 'r2', voided: true, status: RefundStatus.REQUESTED },
          ],
        },
      },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    } as any);
    const { result } = renderHook(() => useBillRefunds('b1'));
    expect(result.current.refunds.every((r: BillRefund) => !r.voided)).toBe(true);
    expect(result.current.refunds).toHaveLength(1);
    expect(result.current.refunds[0].uuid).toBe('r1');
  });
});

describe('requestRefund', () => {
  it('POSTs to billRefund endpoint', async () => {
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { uuid: 'r-new' } } as any);
    await requestRefund({ bill: 'b1', refundAmount: 500, reason: 'overcharged' });
    expect(openmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('billRefund'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('actOnRefund', () => {
  it('POSTs to billRefund/:uuid', async () => {
    vi.mocked(openmrsFetch).mockResolvedValue({ data: { uuid: 'r1' } } as any);
    await actOnRefund('r1', { status: RefundStatus.APPROVED, approver: 'u1' });
    expect(openmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('billRefund/r1'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('voidRefund', () => {
  it('DELETEs with reason query param', async () => {
    vi.mocked(openmrsFetch).mockResolvedValue({} as any);
    await voidRefund('r1', 'entered in error');
    expect(openmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('billRefund/r1?reason='),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
