import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch, restBaseUrl, useOpenmrsFetchAll, useConfig } from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';
import {
  type BillableService,
  type ServiceConcept,
  type CreateBillableServicePayload,
  type UpdateBillableServicePayload,
} from '../types';
import type { BillingConfig } from '../config-schema';

type ResponseObject = {
  results: Array<OpenmrsResource>;
};

export const useBillableServices = () => {
  const url = `${apiBasePath}billableService?v=custom:(uuid,name,shortName,serviceStatus,concept:(uuid,display,name:(name)),serviceType:(display),servicePrices:(uuid,name,price,paymentMode:(uuid,name)))`;
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

export const usePaymentModes = () => {
  const url = `${apiBasePath}paymentMode`;

  const { data, error, isLoading } = useSWR<{ data: ResponseObject }>(url, openmrsFetch);

  const sortedPaymentModes = data?.data.results
    ? [...data.data.results].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return {
    paymentModes: sortedPaymentModes,
    error,
    isLoadingPaymentModes: isLoading,
  };
};

export const createBillableService = (payload: CreateBillableServicePayload) => {
  const url = `${apiBasePath}api/billable-service`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function useConceptsSearch(conceptToLookup: string) {
  const conditionsSearchUrl = `${restBaseUrl}/conceptsearch?q=${conceptToLookup}`;

  const { data, error, isLoading } = useSWR<{ data: { results: Array<ServiceConcept> } }, Error>(
    conceptToLookup ? conditionsSearchUrl : null,
    openmrsFetch,
  );

  return {
    searchResults: data?.data?.results ?? [],
    error: error,
    isSearching: isLoading,
  };
}

export const updateBillableService = (uuid: string, payload: UpdateBillableServicePayload) => {
  const url = `${apiBasePath}/billableService/${uuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const createCashPoint = (payload: any) => {
  const url = `${apiBasePath}cashPoint`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updateCashPoint = (uuid: string, payload: any) => {
  const url = `${apiBasePath}/cashPoint/${uuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
