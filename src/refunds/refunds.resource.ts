import useSWR from 'swr';
import { openmrsFetch, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';
import type { BillRefund, DecideRefundPayload, PatientInvoice, RefundStatus, RequestRefundPayload } from '../types';

interface FetchEnvelope<T> {
  data: { results: T[]; totalCount?: number };
}

const refundUrl = `${apiBasePath}billRefund`;
const billUrl = `${apiBasePath}bill`;

export function useBillRefunds(billUuid: string | undefined) {
  const url = billUuid ? `${refundUrl}?bill=${billUuid}&v=default` : null;
  const { data, isLoading, error, mutate } = useSWR<FetchEnvelope<BillRefund>>(url, openmrsFetch);
  const refunds = (data?.data?.results ?? []).filter((r) => !r.voided);
  return { refunds, isLoading, error, mutate };
}

interface UseRefundRequestsArgs {
  statuses: RefundStatus[];
}

export function useRefundRequests({ statuses }: UseRefundRequestsArgs) {
  const qs = new URLSearchParams({
    refundStatus: statuses.join(','),
    v: 'default',
  });
  const url = `${billUrl}?${qs.toString()}`;
  const { data, isLoading, error, mutate, isValidating } = useOpenmrsFetchAll<PatientInvoice>(url);
  return { bills: data ?? [], isLoading, error, mutate, isValidating };
}

export async function requestRefund(payload: RequestRefundPayload): Promise<BillRefund> {
  const response = await openmrsFetch<BillRefund>(refundUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload as any,
  });
  return response.data;
}

export async function actOnRefund(uuid: string, payload: DecideRefundPayload): Promise<BillRefund> {
  const response = await openmrsFetch<BillRefund>(`${refundUrl}/${uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload as any,
  });
  return response.data;
}

export async function voidRefund(uuid: string, reason: string): Promise<void> {
  await openmrsFetch(`${refundUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' });
}
