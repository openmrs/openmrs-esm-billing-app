import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, ClickableTile } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';

const BillableServicesCardLink: React.FC = () => {
  const { t } = useTranslation();
  const header = t('manageBilling', 'Manage billing');

  return (
    <Layer>
      <ClickableTile href={`${window.spaBase}/billable-services`}>
        <div>
          <div className="heading">{header}</div>
          <div className="content">{t('billingAdministration', 'Billing administration')}</div>
        </div>
        <div className="iconWrapper">
          <ArrowRight size={16} />
        </div>
      </ClickableTile>
    </Layer>
  );
};

export default BillableServicesCardLink;
