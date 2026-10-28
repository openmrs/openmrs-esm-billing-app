import useSWR from 'swr';
import {
  type FetchResponse,
  type OpenmrsResource,
  openmrsFetch,
  restBaseUrl,
  useOpenmrsFetchAll,
  useConfig,
} from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';
import type {
  BillableCommodity,
  BillableService,
  ConceptSearchResult,
  CreateBillableServicePayload,
  PaymentModePayload,
  UpdateBillableServicePayload,
} from '../types';
import type { BillingConfig } from '../config-schema';

const BILLABLE_SERVICES_URL = `billableService?v=custom:(uuid,name,shortName,serviceStatus,concept:(uuid,display,name:(name)),serviceType:(display,uuid),servicePrices:(uuid,name,price,paymentMode:(uuid,name)))`;

export const useBillableServices = () => {
  const url = `${apiBasePath}${BILLABLE_SERVICES_URL}`;
  const { data, isLoading, isValidating, error, mutate } = useOpenmrsFetchAll<BillableService>(url);

  return {
    billableServices: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

export function useServiceTypes() {
  const { serviceTypes } = useConfig<BillingConfig>();
  const serviceConceptUuid = serviceTypes.billableService;
  const url = `${restBaseUrl}/concept/${serviceConceptUuid}?v=custom:(setMembers:(uuid,display))`;

  const { data, error, isLoading } = useSWR<{ data: { setMembers: Array<{ uuid: string; display: string }> } }>(
    url,
    openmrsFetch,
  );

  const sortedServiceTypes = data?.data.setMembers
    ? [...data.data.setMembers].sort((a, b) => a.display.localeCompare(b.display))
    : [];

  return {
    serviceTypes: sortedServiceTypes,
    error,
    isLoadingServiceTypes: isLoading,
  };
}

export interface PaymentMode extends OpenmrsResource {
  name: string;
  description: string;
}

export const usePaymentModes = () => {
  const url = `${apiBasePath}paymentMode`;

  const { data, error, isLoading, mutate } = useSWR<{ data: { results: PaymentMode[] } }>(url, openmrsFetch);
  const sortedPaymentModes = data?.data.results
    ? [...data.data.results].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return {
    paymentModes: sortedPaymentModes as PaymentMode[],
    error,
    isLoadingPaymentModes: isLoading,
    mutate,
  };
};

export function useConceptsSearch(conceptToLookup: string) {
  const conditionsSearchUrl = `${restBaseUrl}/conceptsearch?q=${conceptToLookup}`;

  const { data, error, isLoading } = useSWR<{ data: { results: Array<ConceptSearchResult> } }, Error>(
    conceptToLookup ? conditionsSearchUrl : null,
    openmrsFetch,
  );

  return {
    searchResults: data?.data?.results ?? [],
    error: error,
    isSearching: isLoading,
  };
}

export const createBillableService = async (payload: CreateBillableServicePayload) => {
  const url = `${apiBasePath}api/billable-service`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response;
};

export const updateBillableService = async (uuid: string, payload: UpdateBillableServicePayload) => {
  const url = `${apiBasePath}billableService/${uuid}`;
  const response = await openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response;
};

export const createPaymentMode = (payload: PaymentModePayload) => {
  const url = `${restBaseUrl}/billing/paymentMode`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updatePaymentMode = (uuid: string, payload: PaymentModePayload) => {
  const url = `${restBaseUrl}/billing/paymentMode/${uuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const BILLABLE_COMMODITIES_URL = `${apiBasePath}cashierItemPrice`;

export const useBillableCommodities = () => {
  const url = `${BILLABLE_COMMODITIES_URL}?v=default`;
  const { data, error, isLoading, isValidating, mutate } = useOpenmrsFetchAll<BillableCommodity>(url);

  return {
    billableCommodities: (data ?? []).filter((commodity) => commodity.item?.trim()),
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const createBillableCommodity = (
  payload: Omit<BillableCommodity, 'uuid'>,
): Promise<FetchResponse<BillableCommodity>> =>
  openmrsFetch<BillableCommodity>(BILLABLE_COMMODITIES_URL, {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
  });

export const deleteBillableCommodity = (uuid: string) =>
  openmrsFetch(
    `${BILLABLE_COMMODITIES_URL}/${uuid}?reason=${encodeURIComponent('Rolling back an incomplete multi-price save')}`,
    { method: 'DELETE' },
  );

export const createBillableCommodities = async (payloads: Array<Omit<BillableCommodity, 'uuid'>>) => {
  const createResults = await Promise.allSettled(payloads.map(createBillableCommodity));
  const failedCreate = createResults.find((result) => result.status === 'rejected');

  if (!failedCreate) {
    return createResults.map((result) => (result as PromiseFulfilledResult<FetchResponse<BillableCommodity>>).value);
  }

  const createdCommodities = createResults
    .filter(
      (result): result is PromiseFulfilledResult<FetchResponse<BillableCommodity>> => result.status === 'fulfilled',
    )
    .map((result) => result.value.data);
  const rollbackResults = await Promise.allSettled(
    createdCommodities.map((commodity) => deleteBillableCommodity(commodity.uuid)),
  );

  if (rollbackResults.some((result) => result.status === 'rejected')) {
    throw new Error(
      'Some commodity prices were saved and could not be rolled back. Refresh the catalog before trying again.',
      { cause: failedCreate.reason },
    );
  }

  throw failedCreate.reason;
};

export const updateBillableCommodity = (uuid: string, payload: Partial<BillableCommodity>) =>
  openmrsFetch(`${BILLABLE_COMMODITIES_URL}/${uuid}`, {
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
  });
