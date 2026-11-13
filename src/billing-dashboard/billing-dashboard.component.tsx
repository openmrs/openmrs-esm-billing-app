import React, { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { UserHasAccess } from '@openmrs/esm-framework';
import BillingHeader from '../billing-header/billing-header.component';
import BillsTable from '../bills-table/bills-table.component';
import DiscountRequests from '../discounts/admin/discount-requests.component';
import RefundRequests from '../refunds/admin/refund-requests.component';
import styles from './billing-dashboard.scss';

const VIEW_BILL_REFUNDS_PRIVILEGE = 'View Bill Refunds';
const VIEW_BILL_DISCOUNTS_PRIVILEGE = 'View Bill Discounts';

interface PrivilegedTabProps {
  privilege: string;
  children: React.ReactNode;
}

// Carbon's TabList passes a ref to each child for keyboard navigation, and UserHasAccess cannot take a ref.
// This wrapper forwards the ref to the Tab inside UserHasAccess.
const PrivilegedTab = forwardRef<HTMLButtonElement, PrivilegedTabProps>(({ privilege, children }, ref) => (
  <UserHasAccess privilege={privilege}>
    <Tab ref={ref}>{children}</Tab>
  </UserHasAccess>
));

export function BillingDashboard() {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <>
      <BillingHeader title={t('billing', 'Billing')} />
      {/**
       *
       * TODO: Add this back when the backend has an endpoint to get the metrics
       * The metrics are too intensive to calculate on the frontend since it requires fetching all the bills
       * <MetricsCards />
       **/}
      <Tabs selectedIndex={selectedIndex} onChange={({ selectedIndex }) => setSelectedIndex(selectedIndex)}>
        <TabList aria-label={t('billingTabs', 'Billing tabs')} contained>
          <Tab>{t('bills', 'Bills')}</Tab>
          <PrivilegedTab privilege={VIEW_BILL_REFUNDS_PRIVILEGE}>{t('refunds', 'Refunds')}</PrivilegedTab>
          <PrivilegedTab privilege={VIEW_BILL_DISCOUNTS_PRIVILEGE}>{t('discounts', 'Discounts')}</PrivilegedTab>
        </TabList>
        {/* Render only the selected tab so hidden tabs do not fetch their data */}
        <TabPanels>
          <TabPanel>
            {selectedIndex === 0 && (
              <section className={styles.billsTableContainer}>
                <BillsTable />
              </section>
            )}
          </TabPanel>
          <TabPanel>
            {selectedIndex === 1 && (
              <UserHasAccess privilege={VIEW_BILL_REFUNDS_PRIVILEGE}>
                <RefundRequests />
              </UserHasAccess>
            )}
          </TabPanel>
          <TabPanel>
            {selectedIndex === 2 && (
              <UserHasAccess privilege={VIEW_BILL_DISCOUNTS_PRIVILEGE}>
                <DiscountRequests />
              </UserHasAccess>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
}
