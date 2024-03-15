import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export const useBillableItems = () => {
  const url = `${restBaseUrl}/billing/billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);
  return {
    lineItems: data?.data?.results ?? [],
    isLoading,
    error,
  };
};

export const useCashPoint = () => {
  const url = `${restBaseUrl}/billing/cashPoint`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

  return { isLoading, error, cashPoints: data?.data?.results ?? [] };
};

export const createPatientBill = (payload) => {
  const postUrl = `${restBaseUrl}/billing/bill`;
  return openmrsFetch(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export const usePaymentMethods = () => {
  const url = `${restBaseUrl}/billing/paymentMode`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

  return { isLoading, error, paymentModes: data?.data?.results ?? [] };
};
