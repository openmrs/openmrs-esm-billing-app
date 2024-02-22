import { Type } from '@openmrs/esm-framework';

export interface BillingConfig {}

export const configSchema = {
  patientCatergory: {
    _type: Type.Object,
    _description: 'Patient Category Custom UUIDs',
    _default: {
      paymentDetails: 'caf2124f-00a9-4620-a250-efd8535afd6d',
      paymentMethods: 'c39b684c-250f-4781-a157-d6ad7353bc90',
      policyNumber: '0f4f3306-f01b-43c6-af5b-fdb60015cb02',
      insuranceScheme: '2d0fa959-6780-41f1-85b1-402045935068',
      patientCategory: '3b9dfac8-9e4d-11ee-8c90-0242ac120002',
      formPayloadPending: '919b51c9-8e2e-468f-8354-181bf3e55786',
    },
  },

  catergoryConcepts: {
    _type: Type.Object,
    _description: 'Patient Category Concept UUIDs',
    _default: {
      payingDetails: '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf',
      nonPayingDetails: 'a28d7929-050a-4249-a61a-551e9b8cc102',
      insuranceDetails: 'beac329b-f1dc-4a33-9e7c-d95821a137a6',
      childUnder5: '2d61b762-6e32-4e2e-811f-ac72cbd3600a',
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
};

export interface ConfigObject {
  patientCatergory: Object;
  defaultCurrency: string;
  catergoryConcepts: Object;
  pageSize;
  object;
}
