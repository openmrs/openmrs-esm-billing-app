import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown, InlineLoading, InlineNotification } from '@carbon/react';
import { showSnackbar, getCoreTranslation, useConfig } from '@openmrs/esm-framework';
import { useCashPoint, useBillableItems, createPatientBill, useLastVisitInfo } from './billing-form.resource';
import VisitAttributesForm from './visit-attributes/visit-attributes-form.component';
import { BillStatus } from '../types';
import styles from './billing-checkin-form.scss';

type BillingCheckInFormProps = {
  patientUuid: string;
  setExtraVisitInfo: (state) => void;
};

const BillingCheckInForm: React.FC<BillingCheckInFormProps> = ({ patientUuid, setExtraVisitInfo }) => {
  const { t } = useTranslation();
  const { categoryConcepts } = useConfig();

  const { lastVisitInfo, isLoading: isLoadingLastVisitInfo, error: lastVisitError } = useLastVisitInfo(patientUuid);

  useEffect(() => {
    if (lastVisitError) {
      showSnackbar({
        title: t('lastVisitError', 'Last visit error'),
        subtitle: t('errorLoadingLastVisit', 'An error occurred while loading the last visit'),
        kind: 'error',
      });
    }
  }, [lastVisitError, t]);

  const { cashPoints, isLoading: isLoadingCashPoints, error: cashError } = useCashPoint();
  const { lineItems, isLoading: isLoadingLineItems, error: lineError } = useBillableItems();

  const [attributes, setAttributes] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [selectedBillableItem, setSelectedBillableItem] = useState<any | null>(null);

  const attributesRef = useRef(attributes);
  useEffect(() => {
    attributesRef.current = attributes;
  }, [attributes]);

  const isNonPaying = useMemo(() => {
    if (!categoryConcepts?.nonPayingDetails || !attributes?.length) return false;
    return attributes.some((attr) => attr.value === categoryConcepts.nonPayingDetails);
  }, [attributes, categoryConcepts]);

  const lineList = useMemo(() => {
    if (isNonPaying) return [];
    if (!paymentMethod || !lineItems?.length) return [];

    return lineItems.filter((e) => e.servicePrices.some((p) => p.paymentMode?.uuid === paymentMethod));
  }, [lineItems, paymentMethod, isNonPaying]);

  // reset bill and selection when payment changes or on switching to non-paying
  useEffect(() => {
    setExtraVisitInfo({
      createBillPayload: null,
      handleCreateExtraVisitInfo: null,
      attributes: attributesRef.current,
    });
    setSelectedBillableItem(null);
  }, [paymentMethod, isNonPaying, setExtraVisitInfo]);

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

  const handleBillingService = useCallback(
    ({ selectedItem }: { selectedItem }) => {
      setSelectedBillableItem(selectedItem);

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
            paymentStatus: BillStatus.PENDING,
          },
        ],
        cashPoint: cashPointUuid,
        patient: patientUuid,
        status: BillStatus.PENDING,
        payments: [],
      };
      setExtraVisitInfo({
        createBillPayload,
        handleCreateExtraVisitInfo: () => handleCreateExtraVisitInfo(createBillPayload),
        attributes,
      });
    },
    [attributes, cashPoints, handleCreateExtraVisitInfo, paymentMethod, patientUuid, setExtraVisitInfo],
  );

  if (isLoadingLineItems || isLoadingCashPoints) {
    return (
      <InlineLoading
        status="active"
        iconDescription={getCoreTranslation('loading')}
        description={`${t('loadingBillingServices', 'Loading billing services')}...`}
      />
    );
  }

  const setServicePrice = (prices) => {
    const matchingPrice = prices.find((p) => p.paymentMode?.uuid === paymentMethod);
    return matchingPrice ? `(${matchingPrice.name}: ${matchingPrice.price})` : '';
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
      <h1 className={styles.sectionLabel}>{t('billingDetails', 'Billing details')}</h1>
      <div className={styles.sectionField}>
        {!isLoadingLastVisitInfo && !lastVisitError && lastVisitInfo && (
          <div className={styles.lastVisitBanner}>
            <InlineNotification
              hideCloseButton
              kind="info"
              title={t('lastVisitInfo', 'Last Visit Information')}
              subtitle={t('lastVisitMsg', 'The last visit was a {{type}} {{count}} days ago at {{location}}', {
                count: lastVisitInfo.diffDays,
                type: lastVisitInfo.type,
                location: lastVisitInfo.location,
              })}
              lowContrast
            />
          </div>
        )}
        <VisitAttributesForm setAttributes={setAttributes} setPaymentMethod={setPaymentMethod} />

        {lineList.length > 0 && (
          <Dropdown
            key={`billable-${paymentMethod}`}
            id="billable-items"
            items={lineList}
            itemToString={(item) => (item ? `${item.name} ${setServicePrice(item.servicePrices)}` : '')}
            label={t('selectBillableService', 'Select a billable service')}
            onChange={handleBillingService}
            selectedItem={selectedBillableItem}
            titleText={t('billableService', 'Billable service')}
          />
        )}
      </div>
    </section>
  );
};

export default React.memo(BillingCheckInForm);
