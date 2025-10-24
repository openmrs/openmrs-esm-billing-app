import { type APIRequestContext } from '@playwright/test';
import { type Bill, type BillableService } from './types';

export async function createBillableService(
  api: APIRequestContext,
  serviceName: string,
  price: number,
  currency = 'USD',
): Promise<BillableService> {
  const response = await api.post('billing/billableService', {
    data: {
      name: serviceName,
      shortName: serviceName.substring(0, 10),
      servicePrices: [
        {
          name: 'Default',
          price: price.toString(),
          paymentMode: currency,
        },
      ],
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create billable service: ${await response.text()}`);
  }

  return await response.json();
}

export async function deleteBillableService(api: APIRequestContext, serviceUuid: string) {
  const response = await api.delete(`billing/billableService/${serviceUuid}?purge=true`);
  if (!response.ok()) {
    console.warn(`Failed to delete billable service ${serviceUuid}: ${await response.text()}`);
  }
}

export async function getBillableService(api: APIRequestContext, serviceUuid: string): Promise<BillableService> {
  const response = await api.get(`billing/billableService/${serviceUuid}`);
  if (!response.ok()) {
    throw new Error(`Failed to get billable service: ${await response.text()}`);
  }
  return await response.json();
}

export async function getBill(api: APIRequestContext, billUuid: string): Promise<Bill> {
  const response = await api.get(`billing/bill/${billUuid}`);
  if (!response.ok()) {
    throw new Error(`Failed to get bill: ${await response.text()}`);
  }
  return await response.json();
}

export async function deleteBill(api: APIRequestContext, billUuid: string) {
  const response = await api.delete(`billing/bill/${billUuid}?purge=true`);
  if (!response.ok()) {
    console.warn(`Failed to delete bill ${billUuid}: ${await response.text()}`);
  }
}

/**
 * Extracts numeric value from currency string (e.g., "USD 100.00" -> 100)
 */
export function extractNumericValue(currencyString: string): number {
  const match = currencyString.match(/[\d,]+\.?\d*/);
  if (!match) return 0;
  return parseFloat(match[0].replace(/,/g, ''));
}
