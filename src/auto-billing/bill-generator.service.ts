import { BillableItem } from '../types';
import { AutoBillConfig, ProposedBillItem } from './types';
import { eventListenerService } from './event-listener.service';
import { billingRulesService } from './billing-rules.service';

export class BillGeneratorService {
  async generateProposedBill(
    patientUuid: string,
    config: AutoBillConfig,
    billableItems: BillableItem[],
  ): Promise<ProposedBillItem[]> {
    const events = await eventListenerService.fetchEvents(patientUuid, config);

    const proposedItems: ProposedBillItem[] = [];

    for (const event of events) {
      const match = billingRulesService.matchEventToBillableItem(event, billableItems);
      if (match) {
        proposedItems.push(match);
      }
    }

    return proposedItems;
  }
}

export const billGeneratorService = new BillGeneratorService();
