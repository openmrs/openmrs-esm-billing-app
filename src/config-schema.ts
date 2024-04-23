import { Type } from '@openmrs/esm-framework';

export interface BillingConfig {}

export const configSchema = {
  patientCatergory: {
    _type: Type.Object,
    _description: 'Patient Category Custom UUIDs',
    _default: {
      paymentDetails: 'fbc0702d-b4c9-4968-be63-af8ad3ad6239',
      paymentMethods: '8553afa0-bdb9-4d3c-8a98-05fa9350aa85',
      policyNumber: '3a988e33-a6c0-4b76-b924-01abb998944b',
      insuranceScheme: 'aac48226-d143-4274-80e0-264db4e368ee',
      patientCategory: '3b9dfac8-9e4d-11ee-8c90-0242ac120002',
      formPayloadPending: '919b51c9-8e2e-468f-8354-181bf3e55786',
    },
  },

  catergoryConcepts: {
    _type: Type.Object,
    _description: 'Patient Category Concept UUIDs',
    _default: {
      payingDetails: '44b34972-6630-4e5a-a9f6-a6eb0f109650',
      nonPayingDetails: 'f3fb2d88-cccd-422c-8766-be101ba7bd2e',
      insuranceDetails: 'beac329b-f1dc-4a33-9e7c-d95821a137a6',
      childUnder5: '1528AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      student: '159465AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  },

  defaultCurrency: {
    _type: Type.String,
    _description: 'The default currency for the application. Specify the currency code (e.g., KES, UGX, GBP).',
    _default: 'KES',
  },

  pageSize: {
    _type: Type.String,
    _description: 'The default page size',
    _default: 10,
  },

  showEditBillButton: {
    _type: Type.Boolean,
    _description: 'Whether to show the edit bill button or not.',
    _default: false,
  },
};

export interface ConfigObject {
  patientCatergory: Object;
  defaultCurrency: string;
  catergoryConcepts: Object;
  pageSize;
  object;
  showEditBillButton: boolean;
}
