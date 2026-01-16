import { type DashboardExtensionProps } from '@openmrs/esm-framework';

export const dashboardMeta: Omit<DashboardExtensionProps, 'basePath'> & {
  slot: string;
  columns: number;
  hideDashboardTitle: boolean;
} = {
  slot: 'patient-chart-billing-dashboard-slot',
  columns: 1,
  title: 'billingHistory',
  hideDashboardTitle: true,
  icon: 'omrs-icon-money',
  path: 'Billing history',
};
