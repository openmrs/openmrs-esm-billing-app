import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type BillingConfig } from '../config-schema';
import { useBills } from '../billing.resource';
import BillHistory from './bill-history.component';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockUseBills = jest.mocked<typeof useBills>(useBills);

jest.mock('../billing.resource', () => ({
  useBills: jest.fn(() => ({
    bills: mockBillData,
    isLoading: false,
    isValidating: false,
    error: null,
  })),
}));

window.i18next = {
  language: 'en-US',
} as any;

const testProps = {
  patientUuid: 'some-uuid',
};

const mockBillData = [
  { uuid: '1', patientName: 'John Doe', identifier: '12345678', billingService: 'Checkup', totalAmount: 500 },
  { uuid: '2', patientName: 'John Doe', identifier: '12345678', billingService: 'Consulatation', totalAmount: 600 },
  { uuid: '3', patientName: 'John Doe', identifier: '12345678', billingService: 'Child services', totalAmount: 700 },
  { uuid: '4', patientName: 'John Doe', identifier: '12345678', billingService: 'Medication', totalAmount: 800 },
  { uuid: '5', patientName: 'John Doe', identifier: '12345678', billingService: 'Lab', totalAmount: 900 },
  { uuid: '6', patientName: 'John Doe', identifier: '12345678', billingService: 'Pharmacy', totalAmount: 400 },
  { uuid: '7', patientName: 'John Doe', identifier: '12345678', billingService: 'Nutrition', totalAmount: 300 },
  { uuid: '8', patientName: 'John Doe', identifier: '12345678', billingService: 'Physiotherapy', totalAmount: 200 },
  { uuid: '9', patientName: 'John Doe', identifier: '12345678', billingService: 'Dentist', totalAmount: 1100 },
  { uuid: '10', patientName: 'John Doe', identifier: '12345678', billingService: 'Neuro', totalAmount: 1200 },
  { uuid: '11', patientName: 'John Doe', identifier: '12345678', billingService: 'Outpatient', totalAmount: 1050 },
  { uuid: '12', patientName: 'John Doe', identifier: '12345678', billingService: 'MCH', totalAmount: 1300 },
];

describe('BillHistory', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ ...getDefaultsFromConfigSchema(configSchema), defaultCurrency: 'USD' });
  });

  test('should render loading datatable skeleton', () => {
    mockUseBills.mockReturnValueOnce({
      isLoading: true,
      isValidating: false,
      error: null,
      bills: [],
      mutate: jest.fn(),
    });
    render(<BillHistory {...testProps} />);
    const loadingSkeleton = screen.getByRole('table');
    expect(loadingSkeleton).toBeInTheDocument();
    expect(loadingSkeleton).toHaveClass('cds--skeleton cds--data-table cds--data-table--zebra');
  });

  test('should render error state when API call fails', () => {
    mockUseBills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: new Error('some error'),
      bills: [],
      mutate: jest.fn(),
    });
    render(<BillHistory {...testProps} />);
    const errorState = screen.getByText(/Error/);
    expect(errorState).toBeInTheDocument();
  });

  test('should render bills table', async () => {
    const user = userEvent.setup();
    mockUseBills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: null,
      bills: mockBillData as any,
      mutate: jest.fn(),
    });
    render(<BillHistory {...testProps} />);

    expect(
      screen.getByRole('button', {
        name: /date created/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /billed items/i,
      }),
    ).toBeInTheDocument();

    const tableRowGroup = screen.getAllByRole('rowgroup');
    expect(tableRowGroup).toHaveLength(2);

    // Page navigation should work as expected
    const nextPageButton = screen.getByRole('button', { name: /Next page/ });
    const prevPageButton = screen.getByRole('button', { name: /Previous page/ });

    expect(nextPageButton).toBeInTheDocument();
    expect(prevPageButton).toBeInTheDocument();

    // Check pagination text (using translation keys since we mocked the translator)
    await user.click(nextPageButton);
    await user.click(prevPageButton);

    // clicking the row should expand the row
    const expandAllRowButton = screen.getByRole('button', { name: /Expand all rows/ });
    expect(expandAllRowButton).toBeInTheDocument();
    await user.click(expandAllRowButton);
  });

  test('should render empty state view when there are no bills', () => {
    mockUseBills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: null,
      bills: [],
      mutate: jest.fn(),
    });
    render(<BillHistory {...testProps} />);
    const emptyState = screen.getByText(/There are no bills to display./);
    expect(emptyState).toBeInTheDocument();
  });
});
