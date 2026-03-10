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
  PaymentRequestPayload,
  CreateBillPayload,
  UpdateBillPayload,
} from './types';

/**
 * Safely parse patient display string with multiple format support
 * OpenMRS Standard: Never trust external data format - always validate and provide fallbacks
 */
const parsePatientDisplay = (display: string | undefined): { identifier: string; name: string } => {
  // CRITICAL: Patient identification required for legal compliance (HIPAA, GDPR, WHO standards)
  if (!display) {
    console.warn('[Billing] Patient display is null/undefined - using fallback values');
    return { identifier: 'UNKNOWN-ID', name: 'Unknown Patient' };
  }

  // Handle standard OpenMRS format: "identifier-name"
  if (display.includes('-')) {
    const firstHyphenIndex = display.indexOf('-');
    const identifier = display.substring(0, firstHyphenIndex).trim();
    const name = display.substring(firstHyphenIndex + 1).trim();

    // Validate extracted values are not empty
    if (identifier && name) {
      return { identifier, name };
    }
  }

  // Fallback: No hyphen or invalid format - log warning for data quality monitoring
  console.warn(`[Billing] Unexpected patient.display format: "${display}" - treating as name`);
  return {
    identifier: 'TEMP-ID',
    name: display.trim() || 'Unknown Patient',
  };
};

export const mapBillProperties = (bill: PatientInvoice): MappedBill => {
  const activeLineItems = bill?.lineItems?.filter((item) => !item.voided) || [];

  // CRITICAL FIX: Safe patient display parsing prevents undefined names in financial documents
  const { identifier, name } = parsePatientDisplay(bill?.patient?.display);

  return {
    ...bill,
    patientName: name,
    identifier: identifier,
    patientUuid: bill?.patient?.uuid,
    cashPointUuid: bill?.cashPoint?.uuid,
    cashPointName: bill?.cashPoint?.name,
    cashPointLocation: bill?.cashPoint?.location?.display,
    lineItems: activeLineItems,
    billingService: activeLineItems.map((lineItem) => lineItem?.item || lineItem?.billableService || '--').join('  '),
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

export const processBillPayment = (payload: PaymentRequestPayload, billUuid: string) => {
  const url = `${apiBasePath}bill/${billUuid}/payment`;

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

export const deleteBillItem = (itemUuid: string, voidReason: string) => {
  const url = `${apiBasePath}billLineItem/${itemUuid}?reason=${encodeURIComponent(voidReason)}`;

  return openmrsFetch(url, {
    method: 'DELETE',
  });
};
