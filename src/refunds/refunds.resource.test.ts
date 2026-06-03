import { describe, expect, it, vi, beforeEach } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { requestRefund, actOnRefund, voidRefund } from './refunds.resource';
import { RefundStatus } from '../types';

vi.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: vi.fn(),
  restBaseUrl: '/ws/rest/v1',
}));

beforeEach(() => vi.clearAllMocks());

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
