import { BillableItem, ServicePrice } from '../types';

export interface AutoBillConfig {
  enabled: boolean;
  lookbackDays: number;
  sources: {
    labOrders: boolean;
    drugOrders: boolean;
    procedures: boolean;
    consultations: boolean;
  };
}

export type BillingEventType = 'lab_order' | 'drug_order' | 'procedure' | 'consultation';

export interface BillingEvent {
  id: string;
  type: BillingEventType;
  date: Date;
  conceptUuid: string;
  conceptName: string;
  patientUuid: string;
  originalObject: any;
}

export interface ProposedBillItem {
  event: BillingEvent;
  matchedBillableItem: BillableItem;
  quantity: number;
  confidence: number;
  reason: string;
}
