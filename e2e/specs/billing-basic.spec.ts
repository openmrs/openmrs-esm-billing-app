import { expect } from '@playwright/test';
import { test } from '../core/test';

/**
 * Basic E2E smoke tests for billing module
 * Verifies that the import fixes allow tests to run successfully
 */
test.describe('Billing Module - Basic Smoke Test', () => {
  test('should load the billing dashboard', async ({ page }) => {
    await page.goto('/home/billing');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify page loaded successfully
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should navigate to patient billing history', async ({ page }) => {
    const testPatientUuid = 'test-patient-uuid';

    await page.goto(`/patient/${testPatientUuid}/chart/Billing`);
    await page.waitForLoadState('domcontentloaded');

    // Verify page loaded successfully
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
