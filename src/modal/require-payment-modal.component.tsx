import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineLoading,
  ModalBody,
  ModalFooter,
  ModalHeader,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import { useBills } from '../billing.resource';
import { convertToCurrency } from '../helpers';
import styles from './require-payment.scss';
import { useConfig } from '@openmrs/esm-framework';

type RequirePaymentModalProps = {
  closeModal: () => void;
  patientUuid: string;
};

const RequirePaymentModal: React.FC<RequirePaymentModalProps> = ({ closeModal, patientUuid }) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useConfig();
  const { bills, isLoading, error } = useBills(patientUuid);
  const lineItems = bills.filter((bill) => bill?.status !== 'PAID').flatMap((bill) => bill?.lineItems);

  return (
    <div>
      <ModalHeader closeModal={closeModal} title={t('patientBillingAlert', 'Patient Billing Alert')} />
      <ModalBody>
        <p className={styles.bodyShort02}>
          {t(
            'billPaymentRequiredMessage',
            'The current patient has pending bill. Advice patient to settle bill before receiving services',
          )}
        </p>
        {isLoading && (
          <InlineLoading
            status="active"
            iconDescription="Loading"
            description={t('inlineLoading', 'Loading bill items...')}
          />
        )}
        <StructuredListWrapper isCondensed>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>{t('item', 'Item')}</StructuredListCell>
              <StructuredListCell head>{t('quantity', 'Quantity')}</StructuredListCell>
              <StructuredListCell head>{t('unitPrice', 'Unit price')}</StructuredListCell>
              <StructuredListCell head>{t('total', 'Total')}</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {lineItems.map((lineItem) => {
              return (
                <StructuredListRow>
                  <StructuredListCell>{lineItem.billableService || lineItem.item}</StructuredListCell>
                  <StructuredListCell>{lineItem.quantity}</StructuredListCell>
                  <StructuredListCell>{convertToCurrency(lineItem.price, defaultCurrency)}</StructuredListCell>
                  <StructuredListCell>
                    {convertToCurrency(lineItem.quantity * lineItem.price, defaultCurrency)}
                  </StructuredListCell>
                </StructuredListRow>
              );
            })}
          </StructuredListBody>
        </StructuredListWrapper>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="primary" onClick={closeModal}>
          {t('ok', 'OK')}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default RequirePaymentModal;
