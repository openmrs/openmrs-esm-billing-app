import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openmrsFetch } from '@openmrs/esm-framework';
import { createBillableCommodities } from './billable-service.resource';
import type { BillableCommodity } from '../types';

vi.mock('@openmrs/esm-framework', () => ({
  openmrsFetch: vi.fn(),
  restBaseUrl: '/ws/rest/v1',
  useConfig: vi.fn(),
  useOpenmrsFetchAll: vi.fn(),
}));

vi.mock('swr', () => ({ default: vi.fn() }));

const payload = (paymentModeUuid: string): Omit<BillableCommodity, 'uuid'> => ({
  item: 'item-uuid',
  name: 'Cash',
  price: 100,
  paymentMode: { uuid: paymentModeUuid, name: 'Cash' },
});

describe('createBillableCommodities', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps all prices when every create succeeds', async () => {
    vi.mocked(openmrsFetch)
      .mockResolvedValueOnce({ data: { ...payload('cash'), uuid: 'price-1' } } as any)
      .mockResolvedValueOnce({ data: { ...payload('insurance'), uuid: 'price-2' } } as any);

    await expect(createBillableCommodities([payload('cash'), payload('insurance')])).resolves.toHaveLength(2);
    expect(openmrsFetch).toHaveBeenCalledTimes(2);
  });

  it('rolls back successful prices when another create fails', async () => {
    const createError = new Error('Could not save insurance price');
    vi.mocked(openmrsFetch)
      .mockResolvedValueOnce({ data: { ...payload('cash'), uuid: 'price-1' } } as any)
      .mockRejectedValueOnce(createError)
      .mockResolvedValueOnce({} as any);

    await expect(createBillableCommodities([payload('cash'), payload('insurance')])).rejects.toBe(createError);
    expect(openmrsFetch).toHaveBeenLastCalledWith(expect.stringContaining('cashierItemPrice/price-1?reason='), {
      method: 'DELETE',
    });
  });

  it('warns the user when a successful price cannot be rolled back', async () => {
    vi.mocked(openmrsFetch)
      .mockResolvedValueOnce({ data: { ...payload('cash'), uuid: 'price-1' } } as any)
      .mockRejectedValueOnce(new Error('Could not save insurance price'))
      .mockRejectedValueOnce(new Error('Could not roll back cash price'));

    await expect(createBillableCommodities([payload('cash'), payload('insurance')])).rejects.toThrow(
      'Some commodity prices were saved and could not be rolled back. Refresh the catalog before trying again.',
    );
  });
});
