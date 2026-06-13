import { type OpenmrsResource } from '@openmrs/esm-framework';

export const BillStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  PAID: 'PAID',
  ADJUSTED: 'ADJUSTED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
} as const;

export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export const BillLineItemStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  ADJUSTED: 'ADJUSTED',
  EXEMPTED: 'EXEMPTED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export type BillLineItemStatus = (typeof BillLineItemStatus)[keyof typeof BillLineItemStatus];

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
  status: BillStatus;
  identifier: string;
  dateCreated: string;
  lineItems: Array<LineItem>;
  billingService: string;
  payments: Array<Payment>;
  discounts?: Array<BillDiscount>;
  refunds?: Array<BillRefund>;
  totalAmount?: number;
  netAmount: number;
  tenderedAmount?: number;
  display?: string;
  visitUuid?: string;
  amountAfterDiscount?: number;
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
  status: BillLineItemStatus;
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
  visit?: { uuid: string; display: string };
  resourceVersion: string;
  total: number;
  amountAfterDiscount: number;
  discounts: BillDiscount[];
  refunds: BillRefund[];
}

export interface PatientDetails {
  name: string;
  birthDate: string;
  gender: string;
  address: string;
  age?: number;
  city?: string;
  county?: string;
  subCounty?: string;
}

export interface FacilityDetail {
  uuid: string;
  display: string;
  links: LocationLink[];
}

export type ConceptSearchResult = {
  uuid: string;
  concept: {
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
  drugName?: string;
  purchasePrice?: number;
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
  concept?: ConceptSearchResult;
  servicePrices: Array<ServicePrice>;
}

export type PaymentRequestPayload = {
  instanceType: string;
  amountTendered: number;
  amount: number;
};

export type CreateBillPayload = {
  cashPoint: string;
  cashier: string;
  lineItems: Array<LineItem>;
  payments: Array<PaymentPayload>;
  patient: string;
  status: string;
  visit?: string;
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

export type PaymentModePayload = {
  name: string;
  description: string;
};

export const BillDiscountStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type BillDiscountStatus = (typeof BillDiscountStatus)[keyof typeof BillDiscountStatus];

export const BillDiscountType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const;

export type BillDiscountType = (typeof BillDiscountType)[keyof typeof BillDiscountType];

export interface UserRef {
  uuid: string;
  display: string;
}

export interface BillDiscount {
  uuid: string;
  billUuid: string;
  lineItemUuid: string | null;
  discountType: BillDiscountType;
  discountValue: number;
  discountAmount: number;
  justification: string;
  initiator: UserRef;
  approver: UserRef | null;
  dateCreated: string;
  status: BillDiscountStatus;
  voided: boolean;
}

export interface RequestDiscountPayload {
  bill: string;
  lineItem?: string;
  discountType: BillDiscountType;
  discountValue: number;
  justification: string;
}

export interface DecideDiscountPayload {
  status: Exclude<BillDiscountStatus, 'PENDING'>;
  approver: string;
}

export interface PatientPaymentStatus {
  status: 'PAID' | 'UNPAID' | 'UNKNOWN';
  reason: string;
}
export const RefundStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export interface BillRefund {
  uuid: string;
  billUuid: string;
  lineItemUuid: string | null;
  refundAmount: number;
  reason: string;
  initiator: UserRef;
  approver: UserRef | null;
  completer: UserRef | null;
  dateApproved: string | null;
  dateCompleted: string | null;
  dateCreated: string;
  status: RefundStatus;
  voided: boolean;
}

export interface RequestRefundPayload {
  bill: string;
  lineItem?: string;
  refundAmount: number;
  reason: string;
}

export interface DecideRefundPayload {
  status: Exclude<RefundStatus, 'REQUESTED'>;
  approver?: string;
  completer?: string;
}

export interface PaymentMode {
  uuid: string;
  name: string;
  description?: string;
}

export interface PaymentMethod {
  uuid: string;
  name: string;
  description: string;
}

export type ServiceConcept = {
  uuid: any;
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

export interface StockItem {
  uuid: string;
  drugUuid: string;
  drugName: string;
  conceptUuid: string;
  conceptName: string;
  commonName: string;
}

export interface CashierItem {
  uuid: string;
  display: string;
  name: string;
  price: number;
  paymentMode: PaymentMode;
  item: string;
  billableService: BillableService;
}
