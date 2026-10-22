import React, { useMemo } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SideNavLink } from '@carbon/react';
import { navigate } from '@openmrs/esm-framework';

export interface LinkConfig {
  name: string;
  title: string;
  path: string;
  icon?: React.ComponentType;
}

function DiscountRequestsLinkExtension({ config }: { config: LinkConfig }) {
  const { title, path, icon: Icon } = config;
  const { t } = useTranslation();
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

  return (
    <SideNavLink onClick={handleNavigation} renderIcon={Icon} isActive={isActive}>
      {t(title)}
    </SideNavLink>
  );
}

export const createDiscountRequestsLeftPanelLink = (config: LinkConfig) => () => (
  <BrowserRouter>
    <DiscountRequestsLinkExtension config={config} />
  </BrowserRouter>
);
