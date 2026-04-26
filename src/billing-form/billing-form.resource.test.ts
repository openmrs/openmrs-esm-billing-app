import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import useSWR from 'swr';
import { renderHook } from '@testing-library/react';
import { useLastVisitInfo } from './billing-form.resource';

vi.mock('swr');
const mockUseSWR = vi.mocked(useSWR);

// Pin "now" so diffDays calculations are deterministic
const FIXED_NOW = new Date('2026-01-10T12:00:00Z').getTime();

describe('useLastVisitInfo', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns null lastVisitInfo when there is no visit data yet', () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current.lastVisitInfo).toBeNull();
  });

  it('returns null lastVisitInfo when the visits list is empty', () => {
    mockUseSWR.mockReturnValue({ data: { data: { results: [] } }, isLoading: false, error: undefined } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current.lastVisitInfo).toBeNull();
  });

  it('forwards isLoading and error from SWR', () => {
    const error = new Error('Network error');
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(error);
  });

  it('returns correct visit info for a visit 2 days ago', () => {
    const twoDaysAgo = new Date(FIXED_NOW - 2 * 24 * 60 * 60 * 1000).toISOString();
    mockUseSWR.mockReturnValue({
      data: {
        data: {
          results: [
            {
              startDatetime: twoDaysAgo,
              visitType: { display: 'Outpatient' },
              location: { display: 'Main Clinic' },
            },
          ],
        },
      },
      isLoading: false,
      error: undefined,
    } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current.lastVisitInfo).toEqual({ diffDays: 2, type: 'Outpatient', location: 'Main Clinic' });
  });

  it('returns diffDays of 1 for a visit exactly 1 day ago', () => {
    const oneDayAgo = new Date(FIXED_NOW - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockUseSWR.mockReturnValue({
      data: {
        data: {
          results: [{ startDatetime: oneDayAgo, visitType: { display: 'Inpatient' }, location: { display: 'Ward A' } }],
        },
      },
      isLoading: false,
      error: undefined,
    } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current.lastVisitInfo?.diffDays).toBe(1);
  });

  it('falls back to empty strings when visitType and location are absent', () => {
    const oneDayAgo = new Date(FIXED_NOW - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockUseSWR.mockReturnValue({
      data: { data: { results: [{ startDatetime: oneDayAgo, visitType: null, location: null }] } },
      isLoading: false,
      error: undefined,
    } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current.lastVisitInfo).toEqual({ diffDays: 1, type: '', location: '' });
  });
});
