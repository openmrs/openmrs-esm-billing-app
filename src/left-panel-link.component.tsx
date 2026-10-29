import React, { useMemo } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfigurableLink, useConfig, UserHasAccess } from '@openmrs/esm-framework';
import { type BillingConfig } from './config-schema';

export interface LinkConfig {
  name: string;
  title: string;
  privilege?: string;
}

export function LinkExtension({ config }: { config: LinkConfig }) {
  const { t } = useTranslation();
  const { name, title } = config;
  const { billingLink } = useConfig<BillingConfig>();
  const location = useLocation();
  const spaBasePath = window.getOpenmrsSpaBase() + 'home';

  const isActive = useMemo(() => {
    const pathSegments = location.pathname.split('/').map((s) => decodeURIComponent(s));
    return pathSegments.includes(name);
  }, [location.pathname, name]);

  const link = (
    <ConfigurableLink
      to={spaBasePath + '/' + name}
      className={`cds--side-nav__link ${isActive && 'active-left-nav-link'}`}>
      {t(title)}
    </ConfigurableLink>
  );

  const privilege = config.privilege ?? billingLink?.privilege;
  if (privilege) {
    return <UserHasAccess privilege={privilege}>{link}</UserHasAccess>;
  }

  return link;
}

export const createLeftPanelLink = (config: LinkConfig) => () => (
  <BrowserRouter>
    <LinkExtension config={config} />
  </BrowserRouter>
);
