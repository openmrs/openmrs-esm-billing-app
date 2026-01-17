import { BillableItem } from '../types';
import { BillingEvent, ProposedBillItem } from './types';

export class BillingRulesService {
  matchEventToBillableItem(event: BillingEvent, billableItems: BillableItem[]): ProposedBillItem | null {
    const exactMatch = billableItems.find((item) => item.name.toLowerCase() === event.conceptName.toLowerCase());

    if (exactMatch) {
      return {
        event,
        matchedBillableItem: exactMatch,
        quantity: 1,
        confidence: 1.0,
        reason: 'Exact Name Match',
      };
    }

    return null;
  }
}

export const billingRulesService = new BillingRulesService();
