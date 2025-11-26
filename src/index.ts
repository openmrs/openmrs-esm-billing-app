import { configSchema } from './config-schema';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { createLeftPanelLink } from './left-panel-link.component';
import { dashboardMeta } from './dashboard.meta';
import { defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { Wallet, Money, Settings } from '@carbon/react/icons';
import { createBillableServicesLeftPanelLink } from './billable-services/billable-services-left-panel-link.component';
import { createBillableServicesLeftPanelMenu } from './billable-services/billable-services-left-panel-menu.component';
import AddCashPointModal from './billable-services/cash-point/add-cash-point.modal';
import appMenu from './billable-services/billable-services-menu-item/item.component';
import BillableServiceHome from './billable-services/billable-services-home.component';
import BillableServicesCardLink from './billable-services-admin-card-link.component';
import BillHistory from './bill-history/bill-history.component';
import BillingCheckInForm from './billing-form/billing-checkin-form.component';
import DeletePaymentModeModal from './billable-services/payment-modes/delete-payment-mode.modal';
import EditBillLineItemModal from './bill-item-actions/edit-bill-item.modal';
import PaymentModeFormModal from './billable-services/payment-modes/payment-mode-form.modal';
import RequirePaymentModal from './modal/require-payment.modal';
import RootComponent from './root.component';
import VisitAttributeTags from './invoice/payments/visit-tags/visit-attribute.component';

const moduleName = '@openmrs/esm-billing-app';

const options = {
  featureName: 'billing',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export const billingDashboardLink = getSyncLifecycle(
  // t('billing', 'Billing')
  createLeftPanelLink({
    name: 'billing',
    title: 'billing',
  }),
  options,
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

// t('billingHistory', 'Billing History')
export const billingSummaryDashboardLink = getSyncLifecycle(
  createDashboardLink({ ...dashboardMeta, moduleName }),
  options,
);

// t('billableServices', 'Billable services')
export const billableServicesAppMenuItem = getSyncLifecycle(appMenu, options);

export const billableServicesCardLink = getSyncLifecycle(BillableServicesCardLink, options);

export const billableServicesHome = getSyncLifecycle(BillableServiceHome, options);

export const billingCheckInForm = getSyncLifecycle(BillingCheckInForm, options);

export const billingPatientSummary = getSyncLifecycle(BillHistory, options);

export const requirePaymentModal = getSyncLifecycle(RequirePaymentModal, options);

export const paymentModeFormModal = getSyncLifecycle(PaymentModeFormModal, options);

export const deletePaymentModeModal = getSyncLifecycle(DeletePaymentModeModal, options);

export const addCashPointModal = getSyncLifecycle(AddCashPointModal, options);

export const editBillLineItemModal = getSyncLifecycle(EditBillLineItemModal, options);

export const root = getSyncLifecycle(RootComponent, options);

export const visitAttributeTags = getSyncLifecycle(VisitAttributeTags, options);

// t('billingForm', 'Billing form')
export const billingFormWorkspace = getAsyncLifecycle(() => import('./billing-form/billing-form.component'), options);

// t('billableServiceForm', 'Billable service form')
export const billableServiceFormWorkspace = getAsyncLifecycle(
  () => import('./billable-services/billable-service-form/billable-service-form.workspace'),
  options,
);

// t('billableServices', 'Billable services')
export const billableServicesLeftPanelLink = getSyncLifecycle(
  createBillableServicesLeftPanelLink({
    name: 'billable-services',
    title: 'billableServices',
    path: '',
    icon: Wallet,
  }),
  options,
);

// t('billWaiver', 'Bill waiver')
// Bill waiver feature disabled - O3-5057
// The following export is commented out along with:
// - BillWaiver component import and route in billable-services-home.component.tsx
// - bill-waiver-left-panel-link extension removed from routes.json
// export const billWaiverLeftPanelLink = getSyncLifecycle(
//   createBillableServicesLeftPanelLink({
//     name: 'bill-waiver',
//     title: 'billWaiver',
//     path: 'waive-bill',
//     icon: Money,
//     privilege: 'coreapps.systemAdministration',
//   }),
//   options,
// );

// t('billingSettings', 'Billing settings')
// t('cashPointConfig', 'Cash point configuration')
// t('paymentModesConfig', 'Payment modes configuration')
export const billingSettingsLeftPanelMenu = getSyncLifecycle(
  createBillableServicesLeftPanelMenu({
    title: 'billingSettings',
    icon: Settings,
    privilege: 'coreapps.systemAdministration',
    items: [
      {
        name: 'cash-point-config',
        title: 'cashPointConfig',
        path: 'cash-point-config',
      },
      {
        name: 'payment-modes-config',
        title: 'paymentModesConfig',
        path: 'payment-modes-config',
      },
    ],
  }),
  options,
);

export const deleteListItemConfirmationModal = getAsyncLifecycle(
  () => import('./modal/delete-ListItem.modal'),
  options,
);
