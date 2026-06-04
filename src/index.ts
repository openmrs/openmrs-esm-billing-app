import { FinancialAssets, Settings, TagGroup, Wallet } from '@carbon/react/icons';
import { createDashboard, defineConfigSchema, getAsyncLifecycle, getSyncLifecycle } from '@openmrs/esm-framework';
import { createLeftPanelLink } from './left-panel-link.component';
import { createBillableServicesLeftPanelLink } from './billable-services/billable-services-left-panel-link.component';
import { createBillableServicesLeftPanelMenu } from './billable-services/billable-services-left-panel-menu.component';
import { createDiscountRequestsLeftPanelLink } from './discounts/admin/discount-requests-left-panel-link.component';
import { createRefundRequestsLeftPanelLink } from './refunds/admin/refund-requests-left-panel-link.component';
import appMenu from './billable-services/billable-services-menu-item/item.component';
import BillableServiceHome from './billable-services/billable-services-home.component';
import BillableServicesCardLink from './billable-services-admin-card-link.component';
import BillHistory from './bill-history/bill-history.component';
import BillingCheckInForm from './billing-form/billing-checkin-form.component';
import VisitAttributeTags from './invoice/payments/visit-tags/visit-attribute.component';
import DeletePaymentModeModal from './billable-services/payment-modes/delete-payment-mode.modal';
import EditBillLineItemModal from './bill-item-actions/edit-bill-item.modal';
import PaymentModeFormModal from './billable-services/payment-modes/payment-mode-form.modal';
import RequirePaymentModal from './modal/require-payment.modal';
import AddCashPointModal from './billable-services/cash-point/add-cash-point.modal';
import RequestDiscountModal from './discounts/request-discount.modal';
import ReviewBillDiscountsModal from './discounts/admin/review-bill-discounts/review-bill-discounts.modal';
import RootComponent from './root.component';
import PaymentStatusTag from './payment-status-tag/payment-status-tag.component';
import { configSchema } from './config-schema';
import { dashboardMeta } from './dashboard.meta';

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
export const billingSummaryDashboardLink = getSyncLifecycle(createDashboard(dashboardMeta), options);

// t('billableServices', 'Billable services')
export const billableServicesAppMenuItem = getSyncLifecycle(appMenu, options);

export const billableServicesCardLink = getSyncLifecycle(BillableServicesCardLink, options);

export const billableServicesHome = getSyncLifecycle(BillableServiceHome, options);

export const billingCheckInForm = getSyncLifecycle(BillingCheckInForm, options);

export const billingPatientSummary = getSyncLifecycle(BillHistory, options);

export const visitBillsPanel = getAsyncLifecycle(() => import('./visit-bills/visit-bills-panel.component'), options);

export const requirePaymentModal = getSyncLifecycle(RequirePaymentModal, options);

export const paymentModeFormModal = getSyncLifecycle(PaymentModeFormModal, options);

export const deletePaymentModeModal = getSyncLifecycle(DeletePaymentModeModal, options);

export const addCashPointModal = getSyncLifecycle(AddCashPointModal, options);

export const editBillLineItemModal = getSyncLifecycle(EditBillLineItemModal, options);

export const root = getSyncLifecycle(RootComponent, options);

export const visitAttributeTags = getSyncLifecycle(VisitAttributeTags, options);

export const patientPaymentStatusTag = getSyncLifecycle(PaymentStatusTag, options);

export const billingFormWorkspace = getAsyncLifecycle(() => import('./billing-form/billing-form.workspace'), options);

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

export const deleteLineItemConfirmationModal = getAsyncLifecycle(
  () => import('./modal/delete-line-item-confirmation.modal'),
  options,
);

export const finalizeBillConfirmationModal = getAsyncLifecycle(
  () => import('./modal/finalize-bill-confirmation.modal'),
  options,
);

export const deleteBillConfirmationModal = getAsyncLifecycle(
  () => import('./modal/delete-bill-confirmation.modal'),
  options,
);

export const requestDiscountModal = getSyncLifecycle(RequestDiscountModal, options);

export const reviewBillDiscountsModal = getSyncLifecycle(ReviewBillDiscountsModal, options);

// t('discountRequests', 'Discount requests')
export const discountRequestsLeftPanelLink = getSyncLifecycle(
  createDiscountRequestsLeftPanelLink({
    name: 'discount-requests',
    title: 'discountRequests',
    path: 'discount-requests',
    icon: TagGroup,
  }),
  options,
);

export const requestRefundModal = getAsyncLifecycle(() => import('./refunds/request-refund.modal'), options);

export const reviewBillRefundsModal = getAsyncLifecycle(
  () => import('./refunds/admin/review-bill-refunds/review-bill-refunds.modal'),
  options,
);

// t('refundRequests', 'Refund requests')
export const refundRequestsLeftPanelLink = getSyncLifecycle(
  createRefundRequestsLeftPanelLink({
    name: 'refund-requests',
    title: 'refundRequests',
    path: 'refund-requests',
    icon: FinancialAssets,
  }),
  options,
);
