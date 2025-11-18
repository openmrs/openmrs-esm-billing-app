import { type DashboardLinkConfig } from '@openmrs/esm-patient-common-lib';

export const dashboardMeta: DashboardLinkConfig & { slot: string; columns: number; hideDashboardTitle: boolean } = {
  slot: 'patient-chart-billing-dashboard-slot',
  columns: 1,
  title: 'billingHistory',
  hideDashboardTitle: true,
  icon: 'omrs-icon-money',
  path: 'Billing history',
};
