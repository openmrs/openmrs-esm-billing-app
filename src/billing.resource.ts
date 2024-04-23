import useSWR from 'swr';
import { formatDate, parseDate, openmrsFetch, useSession, useVisit, restBaseUrl } from '@openmrs/esm-framework';
import type { FacilityDetail, MappedBill, PatientInvoice } from './types';
import isEmpty from 'lodash-es/isEmpty';
import sortBy from 'lodash-es/sortBy';
import { apiBasePath, omrsDateFormat } from './constants';
import { useContext } from 'react';
import SelectedDateContext from './hooks/selectedDateContext';
import dayjs from 'dayjs';

export const useBills = (patientUuid: string = '', billStatus: string = '') => {
  const { selectedDate } = useContext(SelectedDateContext);
  const endDate = dayjs().endOf('day').format(omrsDateFormat);
  const url = `${apiBasePath}bill?q=&v=full`;

  const patientUrl = `${apiBasePath}bill?patientUuid=${patientUuid}&v=full`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Array<PatientInvoice> } }>(
    isEmpty(patientUuid) ? url : patientUrl,
    openmrsFetch,
  );

  const mapBillProperties = (bill: PatientInvoice): MappedBill => ({
    id: bill?.id,
    uuid: bill?.uuid,
    patientName: bill?.patient?.display.split('-')?.[1],
    identifier: bill?.patient?.display.split('-')?.[0],
    patientUuid: bill?.patient?.uuid,
    status: bill.lineItems.some((item) => item.paymentStatus === 'PENDING') ? 'PENDING' : 'PAID',
    receiptNumber: bill?.receiptNumber,
    cashier: bill?.cashier,
    cashPointUuid: bill?.cashPoint?.uuid,
    cashPointName: bill?.cashPoint?.name,
    cashPointLocation: bill?.cashPoint?.location?.display,
    dateCreated: bill?.dateCreated ? formatDate(parseDate(bill.dateCreated), { mode: 'wide' }) : '--',
    lineItems: bill?.lineItems,
    billingService: bill?.lineItems.map((bill) => bill?.item || bill?.billableService || '--').join('  '),
    payments: bill?.payments,
    display: bill?.display,
    totalAmount: bill?.lineItems?.map((item) => item.price * item.quantity).reduce((prev, curr) => prev + curr, 0),
  });

  const sortedBills = sortBy(data?.data?.results ?? [], ['dateCreated']).reverse();
  const filteredBills = billStatus === '' ? sortedBills : sortedBills?.filter((bill) => bill?.status === billStatus);
  const mappedResults = filteredBills?.map((bill) => mapBillProperties(bill));

  return {
    bills: mappedResults,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const useBill = (billUuid: string) => {
  const url = `${apiBasePath}bill/${billUuid}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: PatientInvoice }>(
    billUuid ? url : null,
    openmrsFetch,
  );

  const mapBillProperties = (bill: PatientInvoice): MappedBill => ({
    id: bill?.id,
    uuid: bill?.uuid,
    patientName: bill?.patient?.display.split('-')?.[1],
    identifier: bill?.patient?.display.split('-')?.[0],
    patientUuid: bill?.patient?.uuid,
    status:
      bill.lineItems.length > 1
        ? bill.lineItems.some((item) => item.paymentStatus === 'PENDING')
          ? 'PENDING'
          : 'PAID'
        : bill.status,
    receiptNumber: bill?.receiptNumber,
    cashier: bill?.cashier,
    cashPointUuid: bill?.cashPoint?.uuid,
    cashPointName: bill?.cashPoint?.name,
    cashPointLocation: bill?.cashPoint?.location?.display,
    dateCreated: bill?.dateCreated ? formatDate(parseDate(bill.dateCreated), { mode: 'wide' }) : '--',
    lineItems: bill?.lineItems,
    billingService: bill?.lineItems.map((bill) => bill.item).join(' '),
    payments: bill.payments,
    totalAmount: bill?.lineItems?.map((item) => item.price * item.quantity).reduce((prev, curr) => prev + curr, 0),
    tenderedAmount: bill?.payments?.map((item) => item.amountTendered).reduce((prev, curr) => prev + curr, 0),
  });

  const formattedBill = data?.data ? mapBillProperties(data?.data) : null;

  return {
    bill: formattedBill,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const processBillPayment = (payload, billUuid: string) => {
  const url = `${apiBasePath}bill/${billUuid}`;

  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function useDefaultFacility() {
  const url = `${restBaseUrl}/kenyaemr/default-facility`;
  const { authenticated } = useSession();

  const { data, isLoading } = useSWR<{ data: FacilityDetail }>(authenticated ? url : null, openmrsFetch);

  return { data: data?.data, isLoading: isLoading };
}

export const usePatientPaymentInfo = (patientUuid: string) => {
  const { currentVisit } = useVisit(patientUuid);
  const attributes = currentVisit?.attributes ?? [];
  const paymentInformation = attributes
    .map((attribute) => ({
      name: attribute.attributeType.name,
      value: attribute.value,
    }))
    .filter(({ name }) => name === 'Insurance scheme' || name === 'Policy Number');

  return paymentInformation;
};

export function useFetchSearchResults(searchVal, category) {
  let url = ``;
  if (category == 'Stock Item') {
    url = `${restBaseUrl}/stockmanagement/stockitem?v=default&limit=10&q=${searchVal}`;
  } else {
    url = `${apiBasePath}billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  }
  const { data, error, isLoading, isValidating } = useSWR(searchVal ? url : null, openmrsFetch, {});

  return { data: data?.data, error, isLoading: isLoading, isValidating };
}

export const processBillItems = (payload) => {
  const url = `${apiBasePath}bill`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updateBillItems = (payload) => {
  const url = `${apiBasePath}bill/${payload.uuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
