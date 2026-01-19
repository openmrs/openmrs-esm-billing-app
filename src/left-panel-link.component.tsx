import React, { useMemo } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink } from '@openmrs/esm-framework';

export interface LinkConfig {
  name: string;
  title: string;
}

export function LinkExtension({ config }: { config: LinkConfig }) {
  const { t } = useTranslation();
  const { name, title } = config;
  const location = useLocation();
  const spaBasePath = window.getOpenmrsSpaBase() + 'home';

  const isActive = useMemo(() => {
    const pathSegments = location.pathname.split('/').map((s) => decodeURIComponent(s));
    return pathSegments.includes(name);
  }, [location.pathname, name]);

  return (
    <ConfigurableLink
      to={spaBasePath + '/' + name}
      className={`cds--side-nav__link ${isActive && 'active-left-nav-link'}`}>
      {t(title)}
    </ConfigurableLink>
  );
}

export const createLeftPanelLink = (config: LinkConfig) => () => (
  <BrowserRouter>
    <LinkExtension config={config} />
  </BrowserRouter>
);
