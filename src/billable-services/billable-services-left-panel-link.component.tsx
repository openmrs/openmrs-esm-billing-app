import React, { useMemo } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { SideNavLink } from '@carbon/react';
import { navigate, UserHasAccess } from '@openmrs/esm-framework';

export interface BillableServicesLinkConfig {
  name: string;
  title: string;
  path: string;
  icon?: React.ComponentType;
  privilege?: string;
}

function BillableServicesLinkExtension({ config }: { config: BillableServicesLinkConfig }) {
  const { title, path, icon: Icon, privilege } = config;
  const location = useLocation();
  const spaBasePath = `${window.spaBase}/billable-services`;

  const isActive = useMemo(() => {
    const currentPath = location.pathname.replace(spaBasePath, '');
    if (path === '' || path === '/') {
      return currentPath === '' || currentPath === '/';
    }
    return currentPath.startsWith(`/${path}`);
  }, [location.pathname, path, spaBasePath]);

  const handleNavigation = () => {
    navigate({ to: `${spaBasePath}/${path}` });
  };

  const link = (
    <SideNavLink onClick={handleNavigation} renderIcon={Icon} isActive={isActive}>
      {title}
    </SideNavLink>
  );

  if (privilege) {
    return <UserHasAccess privilege={privilege}>{link}</UserHasAccess>;
  }

  return link;
}

export const createBillableServicesLeftPanelLink = (config: BillableServicesLinkConfig) => () => (
  <BrowserRouter>
    <BillableServicesLinkExtension config={config} />
  </BrowserRouter>
);
