import React from 'react';
import {
  Checkbox,
  Layer,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { convertToCurrency } from '../../helpers';
import { type MappedBill, type LineItem } from '../../types';
import BillWaiverForm from './bill-waiver-form.component';
import styles from './bill-waiver.scss';
import { useConfig } from '@openmrs/esm-framework';

const PatientBillsSelections: React.FC<{ bills: MappedBill; setPatientUuid: (patientUuid) => void }> = ({
  bills,
  setPatientUuid,
}) => {
  const { t } = useTranslation();
  const [selectedBills, setSelectedBills] = React.useState<Array<LineItem>>([]);
  const { defaultCurrency } = useConfig();

  const checkBoxLabel = (lineItem) => {
    return `${lineItem.item === '' ? lineItem.billableService : lineItem.item} ${convertToCurrency(lineItem.price, defaultCurrency)}`;
  };

  const handleOnCheckBoxChange = (event, { checked, id }) => {
    const selectedLineItem = bills.lineItems.find((lineItem) => lineItem.uuid === id);
    if (checked) {
      setSelectedBills([...selectedBills, selectedLineItem]);
    } else {
      setSelectedBills(selectedBills.filter((lineItem) => lineItem.uuid !== id));
    }
  };
  return (
    <Layer>
      <StructuredListWrapper className={styles.billListContainer} isCondensed selection={true}>
        <StructuredListHead>
          <StructuredListRow head>
            <StructuredListCell head>{t('billItem', 'Bill item')}</StructuredListCell>
            <StructuredListCell head>{t('quantity', 'Quantity')}</StructuredListCell>
            <StructuredListCell head>{t('unitPrice', 'Unit Price')}</StructuredListCell>
            <StructuredListCell head>{t('total', 'Total')}</StructuredListCell>
            <StructuredListCell head>{t('actions', 'Actions')}</StructuredListCell>
          </StructuredListRow>
        </StructuredListHead>
        <StructuredListBody>
          {bills?.lineItems.map((lineItem) => (
            <StructuredListRow>
              <StructuredListCell>{lineItem.item === '' ? lineItem.billableService : lineItem.item}</StructuredListCell>
              <StructuredListCell>{lineItem.quantity}</StructuredListCell>
              <StructuredListCell>{convertToCurrency(lineItem.price, defaultCurrency)}</StructuredListCell>
              <StructuredListCell>
                {convertToCurrency(lineItem.price * lineItem.quantity, defaultCurrency)}
              </StructuredListCell>
              <StructuredListCell>
                <Checkbox
                  hideLabel
                  onChange={(event, { checked, id }) => handleOnCheckBoxChange(event, { checked, id })}
                  labelText={checkBoxLabel(lineItem)}
                  id={lineItem.uuid}
                />
              </StructuredListCell>
            </StructuredListRow>
          ))}
        </StructuredListBody>
      </StructuredListWrapper>
      <BillWaiverForm bill={bills} lineItems={selectedBills} setPatientUuid={setPatientUuid} />
    </Layer>
  );
};

export default PatientBillsSelections;
