import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SideNav, SideNavItems, SideNavLink } from '@carbon/react';
import { Wallet, Money } from '@carbon/react/icons';
import { useTranslation } from 'react-i18next';
import { UserHasAccess, navigate } from '@openmrs/esm-framework';
import AddBillableService from './create-edit/add-billable-service.component';
import BillWaiver from './bill-waiver/bill-waiver.component';
import BillableServicesDashboard from './dashboard/dashboard.component';
import BillingHeader from '../billing-header/billing-header.component';
import styles from './billable-services.scss';

const BillableServiceHome: React.FC = () => {
  const { t } = useTranslation();
  const basePath = `${window.spaBase}/billable-services`;

  const handleNavigation = (path: string) => {
    navigate({ to: `${basePath}/${path}` });
  };

  const handleCloseAddService = () => {
    navigate({ to: `${basePath}` });
  };

  return (
    <BrowserRouter basename={`${window.spaBase}/billable-services`}>
      <main className={styles.mainSection}>
        <section>
          <SideNav>
            <SideNavItems>
              <SideNavLink onClick={() => handleNavigation('')} renderIcon={Wallet} isActive>
                {t('billableServices', 'Billable Services')}
              </SideNavLink>
              <UserHasAccess privilege="coreapps.systemAdministration">
                <SideNavLink onClick={() => handleNavigation('waive-bill')} renderIcon={Money}>
                  {t('billWaiver', 'Bill waiver')}
                </SideNavLink>
              </UserHasAccess>
            </SideNavItems>
          </SideNav>
        </section>
        <section>
          <BillingHeader title={t('billServicesManagement', 'Bill services management')} />
          <Routes>
            <Route path="/" element={<BillableServicesDashboard />} />
            <Route path="/add-service" element={<AddBillableService onClose={handleCloseAddService} />} />
            <Route path="/waive-bill" element={<BillWaiver />} />
          </Routes>
        </section>
      </main>
    </BrowserRouter>
  );
};

export default BillableServiceHome;
