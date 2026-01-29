import { openmrsFetch, parseDate } from '@openmrs/esm-framework';
import { BillingEvent, AutoBillConfig } from './types';

export class EventListenerService {
  async fetchEvents(patientUuid: string, config: AutoBillConfig): Promise<BillingEvent[]> {
    if (!config.enabled) return [];

    const events: BillingEvent[] = [];
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - config.lookbackDays);

    if (config.sources.labOrders || config.sources.drugOrders) {
      const orders = await this.fetchOrders(patientUuid, lookbackDate);
      events.push(...orders);
    }

    return events;
  }

  private async fetchOrders(patientUuid: string, fromDate: Date): Promise<BillingEvent[]> {
    try {
      const url = `/ws/rest/v1/order?patient=${patientUuid}&v=full`;
      const { data } = await openmrsFetch(url);

      if (!data || !data.results) return [];

      return data.results
        .filter((order: any) => {
          const dateActivated = parseDate(order.dateActivated);
          return dateActivated >= fromDate;
        })
        .map((order: any) => {
          const isDrug = order.type === 'drugorder';
          return {
            id: order.uuid,
            type: isDrug ? 'drug_order' : 'lab_order',
            date: parseDate(order.dateActivated),
            conceptUuid: order.concept.uuid,
            conceptName: order.concept.display,
            patientUuid: order.patient.uuid,
            originalObject: order,
          } as BillingEvent;
        });
    } catch (error) {
      console.error('Error fetching orders for auto-billing', error);
      return [];
    }
  }
}

export const eventListenerService = new EventListenerService();
