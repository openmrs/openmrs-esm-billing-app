import React from 'react';
import { screen, render } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { type BillingConfig } from '../../config-schema';
import { useDefaultFacility } from '../../billing.resource';
import PrintableInvoiceHeader from './printable-invoice-header.component';

const mockUseDefaultFacility = jest.mocked(useDefaultFacility);
const mockUseConfig = jest.mocked(useConfig<BillingConfig>);

jest.mock('../../billing.resource', () => ({
  useDefaultFacility: jest.fn(),
}));

const testProps = {
  patientDetails: {
    name: 'John Doe',
    county: 'Nairobi',
    subCounty: 'Westlands',
    city: 'Nairobi',
    age: '45',
    gender: 'Male',
  },
};

const defaultFacility = { display: 'MTRH', uuid: 'mtrh-uuid', links: [] };

describe('PrintableInvoiceHeader', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      logo: { src: 'logo.png', alt: 'logo' },
      country: 'Kenya',
    } as unknown as BillingConfig);
    mockUseDefaultFacility.mockReturnValue({ data: { display: 'MTRH', uuid: 'mtrh-uuid', links: [] } });
  });

  test('should render PrintableInvoiceHeader component', () => {
    render(<PrintableInvoiceHeader {...testProps} defaultFacility={defaultFacility} />);
    const header = screen.getByText('Invoice');
    expect(header).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Nairobi')).toBeInTheDocument();
    expect(screen.getByText('Westlands, Nairobi')).toBeInTheDocument();
    expect(screen.getByText('MTRH')).toBeInTheDocument();
    expect(screen.getByText('Kenya')).toBeInTheDocument();
  });

  test('should display the logo when logo is provided', () => {
    render(<PrintableInvoiceHeader {...testProps} defaultFacility={defaultFacility} />);
    const logo = screen.getByAltText('logo');
    expect(logo).toBeInTheDocument();
  });

  test('should display the default logo when logo is not provided', () => {
    render(<PrintableInvoiceHeader {...testProps} defaultFacility={defaultFacility} />);
    const logo = screen.getByRole('img');
    expect(logo).toBeInTheDocument();
  });
});
