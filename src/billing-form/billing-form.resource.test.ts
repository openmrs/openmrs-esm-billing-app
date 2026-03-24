import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useLastVisitInfo } from './billing-form.resource';

jest.mock('swr');
const mockUseSWR = jest.mocked(useSWR);

// Pin "now" so diffDays calculations are deterministic
const FIXED_NOW = new Date('2026-01-10T12:00:00Z').getTime();

describe('useLastVisitInfo', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns null when there is no visit data yet', () => {
    mockUseSWR.mockReturnValue({ data: undefined } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current).toBeNull();
  });

  it('returns null when the visits list is empty', () => {
    mockUseSWR.mockReturnValue({ data: { data: { results: [] } } } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current).toBeNull();
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
    } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current).toEqual({ diffDays: 2, type: 'Outpatient', location: 'Main Clinic' });
  });

  it('returns diffDays of 1 for a visit exactly 1 day ago', () => {
    const oneDayAgo = new Date(FIXED_NOW - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockUseSWR.mockReturnValue({
      data: {
        data: {
          results: [{ startDatetime: oneDayAgo, visitType: { display: 'Inpatient' }, location: { display: 'Ward A' } }],
        },
      },
    } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current?.diffDays).toBe(1);
  });

  it('falls back to empty strings when visitType and location are absent', () => {
    const oneDayAgo = new Date(FIXED_NOW - 1 * 24 * 60 * 60 * 1000).toISOString();
    mockUseSWR.mockReturnValue({
      data: { data: { results: [{ startDatetime: oneDayAgo, visitType: null, location: null }] } },
    } as any);
    const { result } = renderHook(() => useLastVisitInfo('patient-uuid'));
    expect(result.current).toEqual({ diffDays: 1, type: '', location: '' });
  });
});
