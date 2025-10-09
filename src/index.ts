import { configSchema } from './config-schema';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { createLeftPanelLink } from './left-panel-link.component';
import { dashboardMeta } from './dashboard.meta';
import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import AddCashPointModal from './billable-services/cash-point/add-cash-point.modal';
import AddPaymentModeModal from './billable-services/payment-modes/add-payment-mode.modal';
import appMenu from './billable-services/billable-services-menu-item/item.component';
import BillableServiceHome from './billable-services/billable-services-home.component';
import BillableServicesCardLink from './billable-services-admin-card-link.component';
import BillHistory from './bill-history/bill-history.component';
import BillingCheckInForm from './billing-form/billing-checkin-form.component';
import DeletePaymentModeModal from './billable-services/payment-modes/delete-payment-mode.modal';
import EditBillableServiceModal from './billable-services/create-edit/edit-billable-service.modal';
import EditBillLineItemModal from './bill-item-actions/edit-bill-item.modal';
import RequirePaymentModal from './modal/require-payment.modal';
import RootComponent from './root.component';
import ServiceMetrics from './billable-services/dashboard/service-metrics.component';
import VisitAttributeTags from './invoice/payments/visit-tags/visit-attribute.component';

const moduleName = '@openmrs/esm-billing-app';

const options = {
  featureName: 'billing',
  moduleName,
};

// t('billing', 'Billing')
export const billingDashboardLink = getSyncLifecycle(
  createLeftPanelLink({
    name: 'billing',
    title: 'Billing',
  }),
  options,
);

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

// t('billingHistory', 'Billing History')
export const billingSummaryDashboardLink = getSyncLifecycle(
  createDashboardLink({ ...dashboardMeta, moduleName }),
  options,
);

export const billableServicesAppMenuItem = getSyncLifecycle(appMenu, options);

export const billableServicesCardLink = getSyncLifecycle(BillableServicesCardLink, options);

export const billableServicesHome = getSyncLifecycle(BillableServiceHome, options);

export const billingCheckInForm = getSyncLifecycle(BillingCheckInForm, options);

export const billingPatientSummary = getSyncLifecycle(BillHistory, options);

export const requirePaymentModal = getSyncLifecycle(RequirePaymentModal, options);

export const addPaymentModeModal = getSyncLifecycle(AddPaymentModeModal, options);

export const deletePaymentModeModal = getSyncLifecycle(DeletePaymentModeModal, options);

export const addCashPointModal = getSyncLifecycle(AddCashPointModal, options);

export const editBillableServiceModal = getSyncLifecycle(EditBillableServiceModal, options);

export const editBillLineItemModal = getSyncLifecycle(EditBillLineItemModal, options);

export const root = getSyncLifecycle(RootComponent, options);

export const serviceMetrics = getSyncLifecycle(ServiceMetrics, options);

export const visitAttributeTags = getSyncLifecycle(VisitAttributeTags, options);

// t('billingForm', 'Billing form')
export const billingFormWorkspace = getAsyncLifecycle(() => import('./billing-form/billing-form.component'), options);
