import React from 'react';
import { screen, render } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { useDefaultFacility } from '../../billing.resource';
import PrintableInvoiceHeader from './printable-invoice-header.component';

const mockUseDefaultFacility = useDefaultFacility as jest.MockedFunction<typeof useDefaultFacility>;
const mockUseConfig = useConfig as jest.MockedFunction<typeof useConfig>;

jest.mock('../../billing.resource', () => ({
  useDefaultFacility: jest.fn(),
}));

jest.mock('@openmrs/esm-framework', () => ({
  useConfig: jest.fn(),
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

describe('PrintableInvoiceHeader', () => {
  test('should render PrintableInvoiceHeader component', () => {
    mockUseConfig.mockReturnValue({ logo: { src: 'logo.png', alt: 'logo' } });
    mockUseDefaultFacility.mockReturnValue({ data: { display: 'MTRH', uuid: 'mtrh-uuid' }, isLoading: false });
    render(<PrintableInvoiceHeader {...testProps} />);
    const header = screen.getByText('Invoice');
    expect(header).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Nairobi')).toBeInTheDocument();
    expect(screen.getByText('Westlands, Nairobi')).toBeInTheDocument();
    expect(screen.getByText('MTRH')).toBeInTheDocument();
    expect(screen.getByText('Kenya')).toBeInTheDocument();
  });

  test('should display the logo when logo is provided', () => {
    mockUseConfig.mockReturnValue({ logo: { src: 'logo.png', alt: 'logo' } });
    mockUseDefaultFacility.mockReturnValue({ data: { display: 'MTRH', uuid: 'mtrh-uuid' }, isLoading: false });
    render(<PrintableInvoiceHeader {...testProps} />);
    const logo = screen.getByAltText('logo');
    expect(logo).toBeInTheDocument();
  });

  test('should display the default logo when logo is not provided', () => {
    mockUseConfig.mockReturnValue({ logo: {} });
    mockUseDefaultFacility.mockReturnValue({ data: { display: 'MTRH', uuid: 'mtrh-uuid' }, isLoading: false });
    render(<PrintableInvoiceHeader {...testProps} />);
    const logo = screen.getByRole('img');
    expect(logo).toBeInTheDocument();
  });
});
