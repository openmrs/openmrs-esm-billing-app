import { restBaseUrl } from '@openmrs/esm-framework';

export const apiBasePath = `${restBaseUrl}/billing/`;

export const omrsDateFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZZ';

export const PAYMENT_MODE_STATUS = {
  status: {
    isInUse: true,
    notInUse: false,
  },
  tagType: {
    inUse: 'red',
    notInUse: 'green',
  },
} as const;
