import { type OpenmrsResource } from '@openmrs/esm-framework';

export interface MappedBill {
  uuid: string;
  id: number;
  patientUuid: string;
  patientName: string;
  cashPointUuid: string;
  cashPointName: string;
  cashPointLocation: string;
  cashier: Provider;
  receiptNumber: string;
  status: string;
  identifier: string;
  dateCreated: string;
  lineItems: Array<LineItem>;
  billingService: string;
  payments: Array<Payment>;
  totalAmount?: number;
  tenderedAmount?: number;
  display?: string;
}

interface LocationLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

interface Location {
  uuid: string;
  display: string;
  links: LocationLink[];
}

interface CashPoint {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  location: Location;
}

interface ProviderLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

interface Provider {
  uuid: string;
  display: string;
  links: ProviderLink[];
}

export interface LineItem {
  uuid?: string;
  item?: string;
  paymentStatus: string;
  billableService?: string;
  quantity: number;
  price: number;
  priceName?: string;
  priceUuid?: string;
  lineItemOrder?: number;
  resourceVersion?: string;
  display?: string;
  voided?: boolean;
  voidReason?: string | null;
}

interface PatientLink {
  rel: string;
  uri: string;
  resourceAlias: string;
}

interface Patient {
  uuid: string;
  display: string;
  links: PatientLink[];
}

interface AttributeType {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
  attributeOrder: number;
  format: string;
  foreignKey: string | null;
  regExp: string | null;
  required: boolean;
}

interface Attribute {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: string | null;
  value: string;
  attributeType: AttributeType;
  order: number;
  valueName: string;
  resourceVersion: string;
}

interface PaymentInstanceType {
  uuid: string;
  name: string;
  description: string;
  retired: boolean;
}

export interface Payment {
  uuid: string;
  instanceType: PaymentInstanceType;
  attributes: Attribute[];
  amount: number;
  amountTendered: number;
  dateCreated: number;
  voided: boolean;
  resourceVersion: string;
}

export type PaymentPayload = {
  amount: number;
  amountTendered: number;
  attributes: Array<Attribute>;
  instanceType: string;
  dateCreated?: Date | number;
};

export interface PatientInvoice {
  uuid: string;
  display: string;
  voided: boolean;
  voidReason: string | null;
  adjustedBy: Array<OpenmrsResource>;
  billAdjusted: OpenmrsResource | null;
  cashPoint: CashPoint;
  cashier: Provider;
  dateCreated: string;
  lineItems: LineItem[];
  patient: Patient;
  payments: Payment[];
  receiptNumber: string;
  status: string;
  adjustmentReason: string | null;
  id: number;
  resourceVersion: string;
}

export interface PatientDetails {
  name: string;
  age: string;
  gender: string;
  city: string;
  county: string;
  subCounty: string;
}

export interface FacilityDetail {
  uuid: string;
  display: string;
}

export type ServiceConcept = {
  uuid: string;
  concept: {
    uuid: string;
    display: string;
  };
  conceptName: {
    uuid: string;
    display: string;
  };
  display: string;
};

export type BillableItem = {
  uuid: string;
  id?: number;
  name?: string;
  commonName?: string;
  servicePrices?: ServicePrice[];
};

export type ServicePrice = {
  itemPriceId?: number;
  name?: string;
  price: string | number;
  paymentMode?: {
    paymentModeId?: number;
    uuid: string;
    name: string;
    description?: string;
    sortOrder?: number;
  };
  billableService?: BillableService;
  uuid: string;
};

export interface BillableService {
  uuid: string;
  name: string;
  shortName: string;
  serviceStatus: string;
  serviceType?: {
    uuid: string;
    display: string;
  };
  concept?: ServiceConcept;
  servicePrices: Array<ServicePrice>;
}

export type BillPaymentPayload = {
  cashPoint: string;
  cashier: string;
  lineItems: Array<LineItem>;
  payments: Array<PaymentPayload>;
  patient: string;
  status?: string;
};

export type CreateBillPayload = {
  cashPoint: string;
  cashier: string;
  lineItems: Array<LineItem>;
  payments: Array<PaymentPayload>;
  patient: string;
  status: string;
};

export type UpdateBillPayload = {
  cashPoint: string;
  cashier: string;
  lineItems: Array<LineItem>;
  patient: string;
  status: string;
  uuid: string;
  payments?: Array<PaymentPayload>;
};

export type CreateBillableServicePayload = {
  name: string;
  shortName: string;
  serviceStatus: string;
  serviceType?: string;
  concept?: string;
  servicePrices: Array<{
    name: string;
    price: number;
    paymentMode: string;
  }>;
};

export type UpdateBillableServicePayload = Partial<CreateBillableServicePayload>;
