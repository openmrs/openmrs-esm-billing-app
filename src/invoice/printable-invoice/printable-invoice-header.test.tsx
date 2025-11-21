import React from 'react';
import { screen, render } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { type BillingConfig } from '../../config-schema';
import { useDefaultFacility } from '../../billing.resource';
import { type MappedBill } from '../../types';
import PrintableInvoiceHeader from './printable-invoice-header.component';

const mockUseDefaultFacility = jest.mocked(useDefaultFacility);
const mockUseConfig = jest.mocked(useConfig<BillingConfig>);

jest.mock('../../billing.resource', () => ({
  useDefaultFacility: jest.fn(),
}));

const testProps = {
  patientDetails: {
    name: 'John Doe',
    address: 'Rongai, Nairobi, Westlands',
    birthDate: '1980-05-15',
    gender: 'Male',
  },
};
const bill = {
  status: 'POSTED',
  receiptNumber: '0050-5',
  dateCreated: '01 — Nov — 2025',
  totalAmount: 100,
  tenderedAmount: 50,
} as MappedBill;

const defaultFacility = { display: 'MTRH', uuid: 'mtrh-uuid', links: [] };

describe('PrintableInvoiceHeader', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      logo: { src: 'logo.png', alt: 'logo' },
      country: 'Kenya',
      defaultCurrency: 'KES',
    } as unknown as BillingConfig);
    mockUseDefaultFacility.mockReturnValue({ data: { display: 'MTRH', uuid: 'mtrh-uuid', links: [] } });
  });

  test('should render PrintableInvoiceHeader component', () => {
    render(<PrintableInvoiceHeader {...testProps} defaultFacility={defaultFacility} bill={bill} />);
    const header = screen.getByText('Invoice');
    expect(header).toBeInTheDocument();

    expect(screen.getByText(/john Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/mtrh/i)).toBeInTheDocument();
    expect(screen.getByText(/Rongai, Nairobi, Westlands/i)).toBeInTheDocument();
    expect(screen.getByText(/kenya/i)).toBeInTheDocument();
    expect(screen.getByText(/male/i)).toBeInTheDocument();
    expect(screen.getByText(/15-May-1980/i)).toBeInTheDocument();
  });

  test('should display the logo when logo is provided', () => {
    render(<PrintableInvoiceHeader {...testProps} defaultFacility={defaultFacility} bill={bill} />);
    const logo = screen.getByAltText('logo');
    expect(logo).toBeInTheDocument();
  });

  test('should display the default OpenMRS SVG logo when logo src is not provided', () => {
    mockUseConfig.mockReturnValue({
      logo: { src: '', alt: '' },
      country: 'Kenya',
      defaultCurrency: 'KES',
    } as unknown as BillingConfig);

    render(<PrintableInvoiceHeader {...testProps} defaultFacility={defaultFacility} bill={bill} />);
    const logo = screen.getByRole('img');
    expect(logo).toBeInTheDocument();
    expect(logo.tagName).toBe('svg');
  });

  test('should display logo alt text when src is empty but alt is provided', () => {
    mockUseConfig.mockReturnValue({
      logo: { src: '', alt: 'Test Facility Logo' },
      country: 'Kenya',
      defaultCurrency: 'KES',
    } as unknown as BillingConfig);

    render(<PrintableInvoiceHeader {...testProps} defaultFacility={defaultFacility} bill={bill} />);
    expect(screen.getByText('Test Facility Logo')).toBeInTheDocument();
  });

  test('should format birthDate correctly', () => {
    const propsWithDifferentDate = {
      patientDetails: {
        ...testProps.patientDetails,
        birthDate: '1995-12-25',
        gender: 'Female',
      },
    };
    render(<PrintableInvoiceHeader {...propsWithDifferentDate} defaultFacility={defaultFacility} bill={bill} />);
    expect(screen.getByText(/25-Dec-1995/i)).toBeInTheDocument();
  });

  test('should not render birthDate and gender when not provided', () => {
    const propsWithoutBirthDateAndGender = {
      patientDetails: {
        ...testProps.patientDetails,
        birthDate: null,
        gender: '',
      },
    };
    render(
      <PrintableInvoiceHeader {...propsWithoutBirthDateAndGender} defaultFacility={defaultFacility} bill={bill} />,
    );

    expect(screen.queryByText(/Date of birth:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gender:/i)).not.toBeInTheDocument();
  });

  test('should handle null defaultFacility gracefully', () => {
    render(<PrintableInvoiceHeader {...testProps} defaultFacility={null} bill={bill} />);
    expect(screen.getByRole('heading', { name: /Invoice/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/john Doe/i)).toBeInTheDocument();
  });
});
