import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { BillingConfig } from '../config-schema';
import { ProposedBillItem } from './types';
import { billGeneratorService } from './bill-generator.service';
import { BillableItem } from '../types';

export function useAutoBilling(patientUuid: string, billableItems: BillableItem[] | undefined) {
  const { autoBilling } = useConfig<BillingConfig>();
  const [proposedItems, setProposedItems] = useState<ProposedBillItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const checkUnbilledEvents = useCallback(async () => {
    if (!autoBilling?.enabled || !patientUuid || !billableItems || billableItems.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const items = await billGeneratorService.generateProposedBill(patientUuid, autoBilling, billableItems);

      if (items.length > 0) {
        setProposedItems(items);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Failed to check unbilled events:', error);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, [autoBilling, patientUuid, billableItems]);

  useEffect(() => {
    if (!hasChecked && billableItems && billableItems.length > 0) {
      checkUnbilledEvents();
    }
  }, [hasChecked, billableItems, checkUnbilledEvents]);

  const closePreview = () => setShowPreview(false);

  return {
    proposedItems,
    showPreview,
    isLoading,
    checkUnbilledEvents,
    closePreview,
  };
}
