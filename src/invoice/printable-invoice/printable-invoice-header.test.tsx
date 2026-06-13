import React from 'react';
import { screen, render } from '@testing-library/react';
import { vi } from 'vitest';
import { useConfig, useSession } from '@openmrs/esm-framework';
import { useDefaultFacility } from '../../billing.resource';
import PrintableInvoiceHeader from './printable-invoice-header.component';

const mockUseDefaultFacility = useDefaultFacility as any;
const mockUseConfig = useConfig as any;

vi.mock('../../billing.resource', () => ({
  useDefaultFacility: vi.fn(),
}));

vi.mock('@openmrs/esm-framework', () => ({
  useConfig: vi.fn(),
  useSession: vi.fn().mockReturnValue({
    sessionLocation: {
      display: 'Test location',
    },
  }),
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
  facility: 'Test Facility',
};

describe('PrintableInvoiceHeader', () => {
  test('should render PrintableInvoiceHeader component', () => {
    mockUseConfig.mockReturnValue({ logo: { src: 'logo.png', alt: 'logo' } });
    render(<PrintableInvoiceHeader {...testProps} />);
    const header = screen.getByText('Invoice');
    expect(header).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Nairobi')).toBeInTheDocument();
    expect(screen.getByText('Westlands, Nairobi')).toBeInTheDocument();
  });

  test('should display the logo when logo is provided', () => {
    mockUseConfig.mockReturnValue({ logo: { src: 'logo.png', alt: 'logo' } });
    mockUseDefaultFacility.mockReturnValue({ data: { display: 'MTRH', uuid: 'mtrh-uuid' }, isLoading: false });
    render(<PrintableInvoiceHeader {...testProps} />);
    const logo = screen.getByAltText('logo');
    expect(logo).toBeInTheDocument();
  });
});
