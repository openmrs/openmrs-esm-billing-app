import React, { useCallback, useState } from 'react';
import { Dropdown, InlineLoading, InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, getCoreTranslation } from '@openmrs/esm-framework';
import { useCashPoint, useBillableItems, createPatientBill } from './billing-form.resource';
import VisitAttributesForm from './visit-attributes/visit-attributes-form.component';
import styles from './billing-checkin-form.scss';

const PENDING_PAYMENT_STATUS = 'PENDING';

type BillingCheckInFormProps = {
  patientUuid: string;
  setExtraVisitInfo: (state) => void;
};

const BillingCheckInForm: React.FC<BillingCheckInFormProps> = ({ patientUuid, setExtraVisitInfo }) => {
  const { t } = useTranslation();
  const { cashPoints, isLoading: isLoadingCashPoints, error: cashError } = useCashPoint();
  const { lineItems, isLoading: isLoadingLineItems, error: lineError } = useBillableItems();
  const [attributes, setAttributes] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState<any>();
  let lineList = [];

  const handleCreateExtraVisitInfo = useCallback(
    async (createBillPayload) => {
      try {
        await createPatientBill(createBillPayload);
        showSnackbar({
          title: t('patientBill', 'Patient bill'),
          subtitle: t('billCreatedSuccessfully', 'Bill created successfully'),
          kind: 'success',
        });
      } catch (error) {
        showSnackbar({
          title: t('billCreationError', 'Bill creation error'),
          subtitle: t('errorCreatingBill', 'An error occurred while creating the bill'),
          kind: 'error',
        });
      }
    },
    [t],
  );

  const handleBillingService = ({ selectedItem }) => {
    const cashPointUuid = cashPoints?.[0]?.uuid ?? '';
    const itemUuid = selectedItem?.uuid ?? '';

    // should default to first price if check returns empty. todo - update backend to return default price
    const priceForPaymentMode =
      selectedItem.servicePrices.find((p) => p.paymentMode?.uuid === paymentMethod) || selectedItem?.servicePrices[0];

    const createBillPayload = {
      lineItems: [
        {
          billableService: itemUuid,
          quantity: 1,
          price: priceForPaymentMode ? priceForPaymentMode.price : '0.000',
          priceName: 'Default',
          priceUuid: priceForPaymentMode ? priceForPaymentMode.uuid : '',
          lineItemOrder: 0,
          paymentStatus: PENDING_PAYMENT_STATUS,
        },
      ],
      cashPoint: cashPointUuid,
      patient: patientUuid,
      status: PENDING_PAYMENT_STATUS,
      payments: [],
    };

    setExtraVisitInfo({
      createBillPayload,
      handleCreateExtraVisitInfo: () => handleCreateExtraVisitInfo(createBillPayload),
      attributes,
    });
  };

  if (isLoadingLineItems || isLoadingCashPoints) {
    return (
      <InlineLoading
        status="active"
        iconDescription={getCoreTranslation('loading')}
        description={`${t('loadingBillingServices', 'Loading billing services')}...`}
      />
    );
  }

  if (paymentMethod) {
    lineList = [];
    lineList = lineItems.filter((e) =>
      e.servicePrices.some((p) => p.paymentMode && p.paymentMode.uuid === paymentMethod),
    );
  }

  const setServicePrice = (prices) => {
    const matchingPrice = prices.find((p) => p.paymentMode?.uuid === paymentMethod);
    return matchingPrice ? `(${matchingPrice.name}:${matchingPrice.price})` : '';
  };

  if (cashError || lineError) {
    return (
      <InlineNotification
        kind="error"
        lowContrast
        title={t('billErrorService', 'Billing service error')}
        subtitle={t('errorLoadingBillServices', 'Error loading bill services')}
      />
    );
  }

  return (
    <section className={styles.sectionContainer}>
      <VisitAttributesForm setAttributes={setAttributes} setPaymentMethod={setPaymentMethod} />
      {
        <>
          <div className={styles.sectionTitle}>{t('billing', 'Billing')}</div>
          <div className={styles.sectionField}></div>
          <Dropdown
            label={t('selectBillableService', 'Select a billable service')}
            onChange={handleBillingService}
            id="billable-items"
            items={lineList}
            itemToString={(item) => (item ? `${item.name} ${setServicePrice(item.servicePrices)}` : '')}
            titleText={t('billableService', 'Billable service')}
          />
        </>
      }
    </section>
  );
};

export default React.memo(BillingCheckInForm);
