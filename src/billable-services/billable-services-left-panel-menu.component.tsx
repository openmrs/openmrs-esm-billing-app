import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { SideNavMenu, SideNavMenuItem } from '@carbon/react';
import { navigate, UserHasAccess } from '@openmrs/esm-framework';

export interface BillableServicesMenuConfig {
  title: string;
  icon?: React.ComponentType;
  privilege?: string;
  items: Array<{
    name: string;
    title: string;
    path: string;
  }>;
}

function BillableServicesMenuExtension({ config }: { config: BillableServicesMenuConfig }) {
  const { title, icon: Icon, items, privilege } = config;
  const { t } = useTranslation();
  const spaBasePath = `${window.spaBase}/billable-services`;

  const handleNavigation = (path: string) => {
    navigate({ to: `${spaBasePath}/${path}` });
  };

  const menu = (
    <SideNavMenu defaultExpanded title={t(title)} renderIcon={Icon}>
      {items.map((item) => (
        <SideNavMenuItem key={item.name} onClick={() => handleNavigation(item.path)}>
          {t(item.title)}
        </SideNavMenuItem>
      ))}
    </SideNavMenu>
  );

  if (privilege) {
    return <UserHasAccess privilege={privilege}>{menu}</UserHasAccess>;
  }

  return menu;
}

export const createBillableServicesLeftPanelMenu = (config: BillableServicesMenuConfig) => () => (
  <BrowserRouter>
    <BillableServicesMenuExtension config={config} />
  </BrowserRouter>
);
