import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch } from '@openmrs/esm-framework';

export const useBillableItems = () => {
  const url = `/ws/rest/v1/cashier/billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);
  return {
    lineItems: data?.data?.results ?? [],
    isLoading,
    error,
  };
};

export const useCashPoint = () => {
  const url = `/ws/rest/v1/cashier/cashPoint`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

  return { isLoading, error, cashPoints: data?.data?.results ?? [] };
};

export const createPatientBill = (payload) => {
  const postUrl = `/ws/rest/v1/cashier/bill`;
  return openmrsFetch(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export const usePaymentMethods = () => {
  const url = `/ws/rest/v1/cashier/paymentMode`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

  return { isLoading, error, paymentModes: data?.data?.results ?? [] };
};
