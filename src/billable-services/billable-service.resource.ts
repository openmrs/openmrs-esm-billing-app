import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch, restBaseUrl, useOpenmrsFetchAll, useConfig } from '@openmrs/esm-framework';
import { type ServiceConcept } from '../types';
import { apiBasePath } from '../constants';
import { type BillableService } from '../types/index';

type ResponseObject = {
  results: Array<OpenmrsResource>;
};

export const useBillableServices = () => {
  const url = `${apiBasePath}billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price))`;

  // Instead of generating with Faker.js, manually create some mock data for testing
  const generateMockBillableServices = (count: number): BillableService[] => {
    const mockBillableServices: BillableService[] = Array.from({ length: count }, (_, i) => ({
      uuid: `uuid-${i}`,
      name: `Service ${i}`,
      shortName: `Short Name ${i}`,
      serviceStatus: i % 2 === 0 ? 'Active' : 'Inactive',
      serviceType: { display: `Type ${i % 5}` },
      servicePrices: [
        {
          name: `Price Type ${i}`,
          price: (i + 1) * 10,
        },
      ],
    }));

    // Log the mock data to the console
    // console.log('Mock Billable Services:', mockBillableServices);

    return mockBillableServices;
  };

  const useMockData = true; // Set this to true for testing

  // If testing, generate mock data instead of using the real API
  if (useMockData) {
    const mockBillableServices = generateMockBillableServices(100); // Generate 100 mock services
    return {
      billableServices: mockBillableServices,
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: () => {},
    };
  }

  // Fetch real data when not in testing mode
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
