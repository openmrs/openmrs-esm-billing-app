import { deleteAllBillsForPatient } from './billing-operations';
import { type APIRequestContext, expect } from '@playwright/test';
import { type Patient } from './types';

/**
 * Generates a random patient for testing using the OpenMRS ID generator service
 */
export const generateRandomPatient = async (api: APIRequestContext, locationUuid?: string): Promise<Patient> => {
  // First, generate a unique identifier using the OpenMRS ID generator service
  // This UUID corresponds to a standard OpenMRS identifier source
  const identifierRes = await api.post('idgen/identifiersource/8549f706-7e85-4c1d-9424-217d50a2988b/identifier', {
    data: {},
  });
  expect(identifierRes.ok()).toBeTruthy();
  const { identifier } = await identifierRes.json();

  // Generate random names to avoid conflicts
  const firstName = `John${Math.floor(Math.random() * 10000)}`;
  const lastName = `Smith${Math.floor(Math.random() * 10000)}`;

  // Create the patient with the generated identifier
  const patientRes = await api.post('patient', {
    data: {
      identifiers: [
        {
          identifier,
          identifierType: '05a29f94-c0ed-11e2-94be-8c13b969e334',
          location: locationUuid || process.env.E2E_LOGIN_DEFAULT_LOCATION_UUID,
          preferred: true,
        },
      ],
      person: {
        addresses: [
          {
            address1: '123 Test Street',
            address2: '',
            cityVillage: 'Test City',
            stateProvince: 'Test State',
            postalCode: '12345',
            country: 'Test Country',
          },
        ],
        attributes: [],
        birthdate: '1990-01-01',
        birthdateEstimated: false,
        dead: false,
        gender: 'M',
        names: [
          {
            givenName: firstName,
            middleName: '',
            familyName: lastName,
            preferred: true,
          },
        ],
      },
    },
  });

  expect(patientRes.ok()).toBeTruthy();
  return await patientRes.json();
};

/**
 * Deletes a patient using the OpenMRS API
 * First deletes all bills associated with the patient
 */
export async function deletePatient(api: APIRequestContext, patientUuid: string) {
  // First, delete all bills for this patient
  await deleteAllBillsForPatient(api, patientUuid);

  // Now delete the patient
  const response = await api.delete(`patient/${patientUuid}?purge=true`);
  if (!response.ok()) {
    console.warn(`Failed to delete patient ${patientUuid}: ${await response.text()}`);
  }
}

/**
 * Waits for a success notification to appear
 */
export async function waitForSuccessNotification(page: any, message?: string) {
  if (message) {
    await page.getByText(message).waitFor({ state: 'visible', timeout: 10000 });
  } else {
    await page.locator('[class*="success"]').first().waitFor({ state: 'visible', timeout: 10000 });
  }
}
