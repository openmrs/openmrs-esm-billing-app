import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type ServiceConcept } from '../types';
import { apiBasePath } from '../constants';

type ResponseObject = {
  results: Array<OpenmrsResource>;
};

export const useBillableServices = () => {
  const url = `${apiBasePath}billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price))`;

  const { data, isLoading, isValidating, error, mutate } = useSWR<{ data: ResponseObject }>(url, openmrsFetch);

  return {
    billableServices: data?.data.results ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
};

export function useServiceTypes() {
  const url = `${restBaseUrl}/concept/21b8cf43-9f9f-4d02-9f4a-d710ece54261?v=custom:(setMembers:(uuid,display))`;

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
