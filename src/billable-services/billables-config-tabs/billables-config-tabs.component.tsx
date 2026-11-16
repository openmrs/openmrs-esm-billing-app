import React from 'react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import BillableCommodities from '../../billable-commodities/billable-commodities.component';
import BillableServicesDashboard from '../dashboard/dashboard.component';
import styles from './billables-config-tabs.scss';

const BillablesConfigurationTabs: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedIndex = location.pathname.endsWith('/billable-commodities') ? 1 : 0;

  return (
    <div className={styles.container}>
      <Tabs
        selectedIndex={selectedIndex}
        onChange={({ selectedIndex: nextIndex }) => navigate(nextIndex === 1 ? '/billable-commodities' : '/')}>
        <TabList contained aria-label={t('billablesConfiguration', 'Billables configuration')}>
          <Tab>{t('billableServices', 'Billable services')}</Tab>
          <Tab>{t('billableCommodities', 'Billable commodities')}</Tab>
        </TabList>
        <div className={styles.content}>
          <TabPanels>
            <TabPanel>{selectedIndex === 0 && <BillableServicesDashboard />}</TabPanel>
            <TabPanel>{selectedIndex === 1 && <BillableCommodities />}</TabPanel>
          </TabPanels>
        </div>
      </Tabs>
    </div>
  );
};

export default BillablesConfigurationTabs;
