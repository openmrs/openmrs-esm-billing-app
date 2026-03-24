import { useMemo } from 'react';
import useSWR from 'swr';
import { type OpenmrsResource, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { apiBasePath } from '../constants';

type LastVisitInfo = {
  diffDays: number;
  type: string;
  location: string;
};

export const useLastVisitInfo = (patientUuid: string): { lastVisitInfo: LastVisitInfo | null; isLoading: boolean; error: any } => {
  const url = `${restBaseUrl}/visit?patient=${patientUuid}&v=default&limit=1&sort=desc:startDatetime`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<any> } }>(patientUuid ? url : null, openmrsFetch);

  const lastVisitInfo = useMemo((): LastVisitInfo | null => {
    const results = data?.data?.results;
    if (!results?.length) return null;

    const visit = results[0];
    const visitDate = new Date(visit.startDatetime);
    const diffTime = Math.abs(Date.now() - visitDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return {
      diffDays,
      type: visit.visitType?.display ?? '',
      location: visit.location?.display ?? '',
    };
  }, [data]);

  return { lastVisitInfo, isLoading, error };
};

export const useBillableItems = () => {
  const url = `${apiBasePath}billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);
  return {
    lineItems: data?.data?.results ?? [],
    isLoading,
    error,
  };
};

export const useCashPoint = () => {
  const url = `${apiBasePath}cashPoint`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

  return { isLoading, error, cashPoints: data?.data?.results ?? [] };
};

export const createPatientBill = (payload) => {
  const postUrl = `${apiBasePath}bill`;
  return openmrsFetch(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export const usePaymentMethods = () => {
  const url = `${apiBasePath}paymentMode`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);

  return { isLoading, error, paymentModes: data?.data?.results ?? [] };
};
