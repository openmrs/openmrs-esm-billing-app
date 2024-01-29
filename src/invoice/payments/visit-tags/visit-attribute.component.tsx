import React from 'react';
import { Tag } from '@carbon/react';
import { usePatientPaymentInfo } from '../../../billing.resource';

type VisitAttributeTagsProps = { patientUuid: string };

const VisitAttributeTags: React.FC<VisitAttributeTagsProps> = ({ patientUuid }) => {
  const patientBillingInfo = usePatientPaymentInfo(patientUuid);
  return (
    <div>
      {patientBillingInfo?.map((tag) => (
        <React.Fragment key={tag.name}>
          <Tag type="gray">{tag.name}</Tag>
          <Tag type="cool-gray">{tag.value}</Tag>
        </React.Fragment>
      ))}
    </div>
  );
};

export default VisitAttributeTags;
