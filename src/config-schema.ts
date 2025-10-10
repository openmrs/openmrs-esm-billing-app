import { Type, validators } from '@openmrs/esm-framework';

export const configSchema = {
  logo: {
    src: {
      _type: Type.String,
      _default: '',
      _description: 'The path or URL to the logo image. If set to an empty string, the alt text will be used.',
      _validators: [validators.isUrl],
    },
    alt: {
      _type: Type.String,
      _default: '',
      _description:
        'The alternative text for the logo image, displayed when the image cannot be loaded or on hover. If not provided and src is empty, the default OpenMRS SVG sprite will be used.',
    },
  },
  country: {
    _type: Type.String,
    _description: 'The text that gets printed on the top right of the invoice, typically the name of the country',
    _default: 'Kenya',
  },
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
    },
  },
  nonPayingPatientCategories: {
    _type: Type.Object,
    _description: 'Concept UUIDs for non-paying patient categories',
    _default: {
      childUnder5: '1528AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      student: '159465AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  },
  postBilledItems: {
    _type: Type.Object,
    _description: 'Post Bill Items such as cashPoints, cashier, priceUUid when submitting a bill',
    _default: {
      cashPoint: '54065383-b4d4-42d2-af4d-d250a1fd2590',
      cashier: 'f9badd80-ab76-11e2-9e96-0800200c9a66',
      priceUuid: '7b9171ac-d3c1-49b4-beff-c9902aee5245',
    },
  },
  serviceTypes: {
    _type: Type.Object,
    _description: 'Post Bill Items such as cashPoints, cashier, priceUUid when submitting a bill',
    _default: {
      billableService: '21b8cf43-9f9f-4d02-9f4a-d710ece54261',
    },
  },
  defaultCurrency: {
    _type: Type.String,
    _description: 'The default currency for the application. Specify the currency code (e.g., KES, UGX, GBP).',
    _default: 'KES',
  },
  pageSize: {
    _type: Type.Number,
    _description: 'The default page size',
    _default: 10,
  },
};

export interface BillingConfig {
  logo: {
    src: string;
    alt: string;
  };
  country: string;
  patientCatergory: {
    paymentDetails: string;
    paymentMethods: string;
    policyNumber: string;
    insuranceScheme: string;
    patientCategory: string;
    formPayloadPending: string;
  };
  catergoryConcepts: {
    payingDetails: string;
    nonPayingDetails: string;
    insuranceDetails: string;
  };
  nonPayingPatientCategories: {
    childUnder5: string;
    student: string;
  };
  postBilledItems: {
    cashPoint: string;
    cashier: string;
    priceUuid: string;
  };
  serviceTypes: {
    billableService: string;
  };
  defaultCurrency: string;
  pageSize: number;
}
