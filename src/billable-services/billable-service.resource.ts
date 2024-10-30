import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch, restBaseUrl, useOpenmrsFetchAll, useConfig } from '@openmrs/esm-framework';
import { type ServiceConcept } from '../types';
import { apiBasePath } from '../constants';
import { type BillableService } from '../types/index';

type ResponseObject = {
  results: Array<OpenmrsResource>;
};

export const useBillableServices = () => {
  const url = `${apiBasePath}billableService?v=custom:(uuid,name,shortName,serviceStatus,concept:(uuid,display,name:(name)),serviceType:(display),servicePrices:(uuid,name,price,paymentMode:(uuid,name)))`;
  const { data, isLoading, isValidating, error, mutate } = useOpenmrsFetchAll<BillableService[]>(url);

  return {
    billableServices: data ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

export function useServiceTypes() {
  const config = useConfig();
  const serviceConceptUuid = config.serviceTypes.billableService;
  const url = `${restBaseUrl}/concept/${serviceConceptUuid}?v=custom:(setMembers:(uuid,display))`;

  const { data, error, isLoading } = useSWR<{ data }>(url, openmrsFetch);

  return {
    serviceTypes: data?.data.setMembers ?? [],
    error,
    isLoading,
  };
}

export const usePaymentModes = () => {
  const url = `${apiBasePath}paymentMode`;

  const { data, error, isLoading } = useSWR<{ data: ResponseObject }>(url, openmrsFetch);

  return {
    paymentModes: data?.data.results ?? [],
    error,
    isLoading,
  };
};

export const createBillableSerice = (payload: any) => {
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

export const updateBillableService = (uuid: string, payload: any) => {
  const url = `${apiBasePath}/billableService/${uuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
