import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  defaultCurrency: {
    _type: Type.String,
    _description: 'The default currency for the application. Specify the currency code (e.g., KES, UGX, GBP).',
    _default: 'KES',
  },
};
export interface ConfigObject {
  defaultCurrency: string;
}