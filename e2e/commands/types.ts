export interface Patient {
  uuid: string;
  display?: string;
  identifiers: Array<{
    identifier: string;
    identifierType: string;
    location: string;
    preferred: boolean;
    display: string;
  }>;
  person: {
    display: string;
    gender: string;
    age?: number;
    birthdate: string;
    birthdateEstimated: boolean;
    dead: boolean;
    deathDate?: string;
    names: Array<{
      givenName: string;
      middleName?: string;
      familyName: string;
      preferred: boolean;
    }>;
    addresses: Array<{
      address1: string;
      address2?: string;
      cityVillage: string;
      stateProvince: string;
      country: string;
      postalCode: string;
    }>;
  };
}

export interface BillableService {
  uuid: string;
  name: string;
  shortName: string;
  servicePrices: Array<{
    uuid: string;
    name: string;
    price: string;
    paymentMode: string;
  }>;
}

export interface Bill {
  uuid: string;
  patient: string;
  cashPoint: string;
  cashier: string;
  receiptNumber?: string;
  status: 'PENDING' | 'PAID' | 'ADJUSTED' | 'POSTED';
  lineItems: Array<{
    uuid: string;
    item: string;
    billableService: string;
    quantity: number;
    price: string;
    priceName: string;
    priceUuid: string;
    lineItemOrder: number;
    paymentStatus: string;
  }>;
  payments: Array<{
    uuid: string;
    instanceType: string;
    amount: number;
    amountTendered?: number;
    attributes: any[];
  }>;
}
