import { openmrsFetch, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';
import type { BillRefund, DecideRefundPayload, PatientInvoice, RefundStatus, RequestRefundPayload } from '../types';

const refundUrl = `${apiBasePath}billRefund`;
const billUrl = `${apiBasePath}bill`;

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
    body: payload,
  });
  return response.data;
}

export async function actOnRefund(uuid: string, payload: DecideRefundPayload): Promise<BillRefund> {
  const response = await openmrsFetch<BillRefund>(`${refundUrl}/${uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  return response.data;
}

export async function voidRefund(uuid: string, reason: string): Promise<void> {
  await openmrsFetch(`${refundUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' });
}
