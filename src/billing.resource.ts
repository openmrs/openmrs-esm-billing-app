import useSWR from 'swr';
import sortBy from 'lodash-es/sortBy';
import {
  formatDate,
  parseDate,
  openmrsFetch,
  useSession,
  useVisit,
  type SessionLocation,
  useOpenmrsFetchAll,
  useOpenmrsPagination,
} from '@openmrs/esm-framework';
import { apiBasePath } from './constants';
import type {
  MappedBill,
  PatientInvoice,
  BillableItem,
  BillPaymentPayload,
  CreateBillPayload,
  UpdateBillPayload,
} from './types';

export const mapBillProperties = (bill: PatientInvoice): MappedBill => {
  const activeLineItems = bill?.lineItems?.filter((item) => !item.voided) || [];
  const isSpecialStatus = bill.status === 'POSTED';

  return {
    id: bill?.id,
    uuid: bill?.uuid,
    patientName: bill?.patient?.display?.split('-')?.[1],
    identifier: bill?.patient?.display?.split('-')?.[0],
    patientUuid: bill?.patient?.uuid,
    status: bill?.status,
    receiptNumber: bill?.receiptNumber,
    cashier: bill?.cashier,
    cashPointUuid: bill?.cashPoint?.uuid,
    cashPointName: bill?.cashPoint?.name,
    cashPointLocation: bill?.cashPoint?.location?.display,
    dateCreated: bill?.dateCreated ? formatDate(parseDate(bill.dateCreated), { mode: 'wide' }) : '--',
    lineItems: activeLineItems,
    billingService: activeLineItems.map((lineItem) => lineItem?.item || lineItem?.billableService || '--').join('  '),
    payments: bill.payments,
    display: bill?.display,
    totalAmount: activeLineItems
      .map((item) => (item.price ?? 0) * (item.quantity ?? 0))
      .reduce((prev, curr) => prev + curr, 0),
    tenderedAmount: (bill?.payments ?? [])
      .map((item) => item.amountTendered ?? 0)
      .reduce((prev, curr) => prev + curr, 0),
  };
};

export const usePaginatedBills = (pageSize: number, status?: string, patientName?: string) => {
  const customRepresentation =
    '(id,uuid,dateCreated,status,receiptNumber,patient:(uuid,display),lineItems:(uuid,item,billableService,voided))';

  let url = `${apiBasePath}bill?v=custom:${customRepresentation}&pageSize=${pageSize}`;

  if (status) {
    url += `&status=${status}`;
  }

  if (patientName) {
    url += `&patientName=${encodeURIComponent(patientName)}`;
  }

  const { data, error, isLoading, isValidating, mutate, currentPage, totalCount, goTo } =
    useOpenmrsPagination<PatientInvoice>(url, pageSize);

  // Backend already sorts by ID descending (newest first), so no need to sort on frontend
  const mappedResults = data?.map((bill) => mapBillProperties(bill));

  return {
    bills: mappedResults,
    error,
    isLoading,
    isValidating,
    mutate,
    currentPage,
    totalCount,
    goTo,
  };
};

export const useBills = (patientUuid?: string, billStatus?: string) => {
  // Build URL with status parameter if provided
  let url = `${apiBasePath}bill?v=full`;

  if (patientUuid) {
    url += `&patientUuid=${patientUuid}`;
  }

  if (billStatus) {
    url += `&status=${billStatus}`;
  }

  const { data, error, isLoading, isValidating, mutate } = useOpenmrsFetchAll<PatientInvoice>(url);

  const sortedBills = sortBy(data ?? [], ['dateCreated']).reverse();
  const mappedResults = sortedBills?.map((bill) => mapBillProperties(bill));

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

  const formattedBill = data?.data ? mapBillProperties(data?.data) : null;

  return {
    bill: formattedBill,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const processBillPayment = (payload: BillPaymentPayload, billUuid: string) => {
  const url = `${apiBasePath}bill/${billUuid}`;

  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function useDefaultFacility(): { data: SessionLocation | null } {
  const { sessionLocation } = useSession();
  return { data: sessionLocation };
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

export function useBillableServices() {
  const url = `${apiBasePath}billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  return useOpenmrsFetchAll<BillableItem>(url);
}

export const processBillItems = (payload: CreateBillPayload) => {
  const url = `${apiBasePath}bill`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updateBillItems = (payload: UpdateBillPayload) => {
  const url = `${apiBasePath}bill/${payload.uuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const deleteBillItem = (itemUuid: string) => {
  const url = `${apiBasePath}billLineItem/${itemUuid}`;

  return openmrsFetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
};
