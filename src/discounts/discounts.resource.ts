import useSWR from 'swr';
import { openmrsFetch, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';
import type {
  BillDiscount,
  BillDiscountStatus,
  DecideDiscountPayload,
  PatientInvoice,
  RequestDiscountPayload,
} from '../types';

interface FetchEnvelope<T> {
  data: { results: T[]; totalCount?: number };
}

const discountUrl = `${apiBasePath}billDiscount`;
const billUrl = `${apiBasePath}bill`;

export function useBillDiscounts(billUuid: string | undefined) {
  const url = billUuid ? `${discountUrl}?bill=${billUuid}&v=default` : null;
  const { data, isLoading, error, mutate } = useSWR<FetchEnvelope<BillDiscount>>(url, openmrsFetch);
  const discounts = (data?.data?.results ?? []).filter((d) => !d.voided);
  return { discounts, isLoading, error, mutate };
}

interface UseDiscountRequestsArgs {
  statuses: BillDiscountStatus[];
}

export function useDiscountRequests({ statuses }: UseDiscountRequestsArgs) {
  const qs = new URLSearchParams({
    discountStatus: statuses.join(','),
    v: 'default',
  });
  const url = `${billUrl}?${qs.toString()}`;
  const { data, isLoading, error, mutate, isValidating } = useOpenmrsFetchAll<PatientInvoice>(url);
  return {
    bills: data ?? [],
    isLoading,
    error,
    mutate,
    isValidating,
  };
}

export async function requestDiscount(payload: RequestDiscountPayload): Promise<BillDiscount> {
  const response = await openmrsFetch<BillDiscount>(discountUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload as any,
  });
  return response.data;
}

export async function decideDiscount(
  uuid: string,
  status: DecideDiscountPayload['status'],
  approverUuid: string,
): Promise<BillDiscount> {
  const body: DecideDiscountPayload = { status, approver: approverUuid };
  const response = await openmrsFetch<BillDiscount>(`${discountUrl}/${uuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body as any,
  });
  return response.data;
}

export async function voidDiscount(uuid: string, reason: string): Promise<void> {
  await openmrsFetch(`${discountUrl}/${uuid}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' });
}
