import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch } from '@openmrs/esm-framework';
import { type ServiceConcept } from '../types';

type ResponseObject = {
  results: Array<OpenmrsResource>;
};

export const useBillableServices = () => {
  const url = `/ws/rest/v1/cashier/billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price))`;

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
  const url = `/ws/rest/v1/concept/d7bd4cc0-90b1-4f22-90f2-ab7fde936727?v=custom:(setMembers:(uuid,display))`;

  const { data, error, isLoading } = useSWR<{ data }>(url, openmrsFetch);

  return {
    serviceTypes: data?.data.setMembers ?? [],
    error,
    isLoading,
  };
}

export const usePaymentModes = () => {
  const url = `/ws/rest/v1/cashier/paymentMode`;

  const { data, error, isLoading } = useSWR<{ data: ResponseObject }>(url, openmrsFetch);

  return {
    paymentModes: data?.data.results ?? [],
    error,
    isLoading,
  };
};

export const createBillableSerice = (payload: any) => {
  const url = `/ws/rest/v1/cashier/api/billable-service`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function useConceptsSearch(conceptToLookup: string) {
  const conditionsSearchUrl = `/ws/rest/v1/conceptsearch?q=${conceptToLookup}`;

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
