import { type APIRequestContext } from '@playwright/test';
import { type BillableService } from './types';

interface PaymentMode {
  uuid: string;
  name: string;
  description: string;
}

/**
 * Ensures that a billable service has a Cash price configured.
 * If the service already has a Cash price, this function does nothing.
 * Otherwise, it adds a Cash price to the service (preserving any other existing prices).
 *
 * @param api - Playwright API request context
 * @param serviceUuid - UUID of the billable service
 * @param defaultPrice - Default price to set for Cash payment mode
 * @returns The billable service with Cash price configured
 */
export async function ensureServiceHasPrices(
  api: APIRequestContext,
  serviceUuid: string,
  defaultPrice: number,
): Promise<BillableService> {
  // Get the service first
  let service = await getBillableService(api, serviceUuid);

  // Check if service already has a Cash price specifically
  const existingCashPrice = service.servicePrices?.find((sp) => sp.name === 'Cash');
  if (existingCashPrice) {
    return service;
  }

  // Get payment modes to find Cash payment mode
  const paymentModesResponse = await api.get('billing/paymentMode');
  if (!paymentModesResponse.ok()) {
    throw new Error(`Failed to get payment modes: ${await paymentModesResponse.text()}`);
  }

  const paymentModesData = await paymentModesResponse.json();
  const paymentModes: PaymentMode[] = paymentModesData.results || [];
  const cashMode = paymentModes.find((mode) => mode.name === 'Cash');

  if (!cashMode) {
    throw new Error('Cash payment mode not found in the system');
  }

  // Prepare the updated prices array (keep existing prices + add new Cash price)
  const updatedPrices = [
    ...(service.servicePrices || []),
    {
      name: 'Cash',
      price: defaultPrice,
      paymentMode: cashMode.uuid,
    },
  ];

  // Update the service with all prices
  const updateResponse = await api.post(`billing/billableService/${serviceUuid}`, {
    data: {
      servicePrices: updatedPrices,
    },
  });

  if (!updateResponse.ok()) {
    throw new Error(`Failed to add service prices: ${await updateResponse.text()}`);
  }

  // Fetch and return the updated service to ensure we have the latest state
  service = await getBillableService(api, serviceUuid);
  return service;
}

async function getBillableService(api: APIRequestContext, serviceUuid: string): Promise<BillableService> {
  const response = await api.get(`billing/billableService/${serviceUuid}`);
  if (!response.ok()) {
    throw new Error(`Failed to get billable service: ${await response.text()}`);
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
