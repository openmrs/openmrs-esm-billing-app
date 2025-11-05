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
  patientCategory: {
    _type: Type.Object,
    _description:
      'Visit Attribute Type UUIDs - These are custom attribute types that can be attached to patient visits. Each UUID represents a Visit Attribute Type in OpenMRS that stores payment-related information for the visit.',
    _default: {
      // Payment details attribute type (e.g., "Paying" or "Non-paying")
      paymentDetails: 'fbc0702d-b4c9-4968-be63-af8ad3ad6239',
      // Payment method attribute type (e.g., cash, insurance, mobile money)
      paymentMethods: '8553afa0-bdb9-4d3c-8a98-05fa9350aa85',
      // Insurance policy number attribute type
      policyNumber: '3a988e33-a6c0-4b76-b924-01abb998944b',
      // Insurance scheme name attribute type
      insuranceScheme: 'aac48226-d143-4274-80e0-264db4e368ee',
      // Patient category classification attribute type
      patientCategory: '3b9dfac8-9e4d-11ee-8c90-0242ac120002',
      // Form payload pending status attribute type
      formPayloadPending: '919b51c9-8e2e-468f-8354-181bf3e55786',
    },
  },
  categoryConcepts: {
    _type: Type.Object,
    _description:
      'Concept UUIDs - These are OpenMRS Concept UUIDs that represent the actual values/options for payment categories. These concepts are stored as values in the visit attributes defined in patientCategory.',
    _default: {
      // Concept UUID representing "Paying" payment category
      payingDetails: '44b34972-6630-4e5a-a9f6-a6eb0f109650',
      // Concept UUID representing "Non-paying" payment category
      nonPayingDetails: 'f3fb2d88-cccd-422c-8766-be101ba7bd2e',
      // Concept UUID representing "Insurance" as a payment method
      insuranceDetails: 'beac329b-f1dc-4a33-9e7c-d95821a137a6',
    },
  },
  nonPayingPatientCategories: {
    _type: Type.Object,
    _description:
      'Concept UUIDs for non-paying patient categories - These are OpenMRS Concept UUIDs that identify specific patient categories eligible for non-paying status (e.g., children under 5, students). These are used as values when a patient is categorized as non-paying.',
    _default: {
      // Concept UUID for "Child Under 5" category
      childUnder5: '1528AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      // Concept UUID for "Student" category
      student: '159465AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  },
  postBilledItems: {
    _type: Type.Object,
    _description:
      'Default UUIDs used when creating bills - These UUIDs identify default resources (cash points, cashier providers) that are used when submitting a bill if not explicitly provided.',
    _default: {
      // Default Cash Point UUID - The cashier station/location where bills are processed
      cashPoint: '54065383-b4d4-42d2-af4d-d250a1fd2590',
      // Default Cashier Provider UUID - The provider/user UUID that identifies the cashier processing the bill
      cashier: 'f9badd80-ab76-11e2-9e96-0800200c9a66',
      // Default Price UUID - The service price UUID used when creating bills (currently unused in code)
      priceUuid: '7b9171ac-d3c1-49b4-beff-c9902aee5245',
    },
  },
  serviceTypes: {
    _type: Type.Object,
    _description:
      'Service Type Concept Set UUID - This is an OpenMRS Concept Set UUID. The set members of this concept represent the different types of services that can be billed (e.g., Consultation, Lab Test, Procedure).',
    _default: {
      // Concept Set UUID - The concept set whose members represent the different service types that can be billed
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

/**
 * Configuration interface for the Billing module.
 * All UUIDs represent OpenMRS resources that must exist in the system.
 * See the configSchema above for detailed descriptions of each property.
 */
export interface BillingConfig {
  logo: {
    src: string;
    alt: string;
  };
  country: string;
  patientCategory: {
    paymentDetails: string;
    paymentMethods: string;
    policyNumber: string;
    insuranceScheme: string;
    patientCategory: string;
    formPayloadPending: string;
  };
  categoryConcepts: {
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
