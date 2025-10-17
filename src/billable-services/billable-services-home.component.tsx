import React from 'react';
import classNames from 'classnames';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLeftNav, navigate, WorkspaceContainer, useLayoutType, isDesktop } from '@openmrs/esm-framework';
import AddBillableService from './create-edit/add-billable-service.component';
import BillWaiver from './bill-waiver/bill-waiver.component';
import BillableServicesDashboard from './dashboard/dashboard.component';
import BillingHeader from '../billing-header/billing-header.component';
import CashPointConfiguration from './cash-point/cash-point-configuration.component';
import PaymentModesConfig from './payment-modes/payment-modes-config.component';
import styles from './billable-services.scss';

const BillableServiceHome: React.FC = () => {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const basePath = `${window.spaBase}/billable-services`;

  useLeftNav({ name: 'billable-services-left-panel-slot', basePath });

  const handleCloseAddService = () => {
    navigate({ to: `${basePath}` });
  };

  return (
    <BrowserRouter basename={basePath}>
      <div className={styles.pageWrapper}>
        <main className={classNames(styles.pageContent, { [styles.hasLeftNav]: isDesktop(layout) })}>
          <BillingHeader title={t('billableServicesManagement', 'Billable services management')} />
          <Routes>
            <Route path="/" element={<BillableServicesDashboard />} />
            <Route path="/add-service" element={<AddBillableService onClose={handleCloseAddService} />} />
            <Route path="/waive-bill" element={<BillWaiver />} />
            <Route path="/cash-point-config" element={<CashPointConfiguration />} />
            <Route path="/payment-modes-config" element={<PaymentModesConfig />} />
          </Routes>
        </main>
      </div>
      <WorkspaceContainer contextKey="billable-services" />
    </BrowserRouter>
  );
};

export default BillableServiceHome;
