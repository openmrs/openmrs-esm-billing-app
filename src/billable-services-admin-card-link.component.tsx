import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, ClickableTile } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';

const BillableServicesCardLink: React.FC = () => {
  const { t } = useTranslation();
  const header = t('billingAdministration', 'Billing administration');

  return (
    <Layer>
      <ClickableTile href={`${window.spaBase}/billable-services`}>
        <div>
          <div className="heading">{header}</div>
          <div className="content">
            {t(
              'billingAdministrationDescription',
              'Billable services, cash points, payment modes, discounts, and refunds',
            )}
          </div>
        </div>
        <div className="iconWrapper">
          <ArrowRight size={16} />
        </div>
      </ClickableTile>
    </Layer>
  );
};

export default BillableServicesCardLink;
