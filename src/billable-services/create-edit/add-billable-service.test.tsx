import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { navigate, type FetchResponse } from '@openmrs/esm-framework';
import {
  createBillableService,
  useBillableServices,
  useConceptsSearch,
  usePaymentModes,
  useServiceTypes,
} from '../billable-service.resource';
import AddBillableService from './add-billable-service.component';

const mockUseBillableServices = jest.mocked(useBillableServices);
const mockUsePaymentModes = jest.mocked(usePaymentModes);
const mockUseServiceTypes = jest.mocked(useServiceTypes);
const mockCreateBillableService = jest.mocked(createBillableService);
const mockUseConceptsSearch = jest.mocked(useConceptsSearch);

jest.mock('../billable-service.resource', () => ({
  useBillableServices: jest.fn(),
  usePaymentModes: jest.fn(),
  useServiceTypes: jest.fn(),
  createBillableService: jest.fn(),
  updateBillableService: jest.fn(),
  useConceptsSearch: jest.fn(),
}));

const mockPaymentModes = [
  { uuid: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74', name: 'Cash', description: 'Cash Payment', retired: false },
  {
    uuid: 'beac329b-f1dc-4a33-9e7c-d95821a137a6',
    name: 'Insurance',
    description: 'Insurance method of payment',
    retired: false,
  },
  {
    uuid: '28989582-e8c3-46b0-96d0-c249cb06d5c6',
    name: 'MPESA',
    description: 'Mobile money method of payment',
    retired: false,
  },
];

const mockServiceTypes = [
  { uuid: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6', display: 'Lab service' },
  { uuid: 'b75e466f-a6f5-4d5e-849a-84424d3c85cd', display: 'Pharmacy service' },
  { uuid: 'ce914b2d-44f6-4b6c-933f-c57a3938e35b', display: 'Peer educator service' },
  { uuid: 'c23d3224-2218-4007-8f22-e1f3d5a8e58a', display: 'Nutrition service' },
  { uuid: '65487ff4-63b3-452a-8985-6a1f4a0cc08d', display: 'TB service' },
  { uuid: '9db142d5-5cc4-4c05-9f83-06ed294caa67', display: 'Family planning service' },
  { uuid: 'a487a743-62ce-4f93-a66b-c5154ee8987d', display: 'Adherence counselling  service' },
];

describe('AddBillableService', () => {
  test('should render billable services form and generate correct payload', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    mockUseBillableServices.mockReturnValue({
      billableServices: [],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
      isValidating: false,
    });
    mockUsePaymentModes.mockReturnValue({ paymentModes: mockPaymentModes, error: null, isLoadingPaymentModes: false });
    mockUseServiceTypes.mockReturnValue({ serviceTypes: mockServiceTypes, error: false, isLoadingServiceTypes: false });
    mockUseConceptsSearch.mockReturnValue({ searchResults: [], isSearching: false, error: null });

    render(<AddBillableService onClose={mockOnClose} />);

    const formTitle = screen.getByRole('heading', { name: /Add Billable Services/i });
    expect(formTitle).toBeInTheDocument();

    const serviceNameTextInp = screen.getByRole('textbox', { name: /Service Name/i });
    expect(serviceNameTextInp).toBeInTheDocument();

    const serviceShortNameTextInp = screen.getByRole('textbox', { name: /Short Name/i });
    expect(serviceShortNameTextInp).toBeInTheDocument();

    await user.type(serviceNameTextInp, 'Test Service Name');
    await user.type(serviceShortNameTextInp, 'Test Short Name');

    expect(serviceNameTextInp).toHaveValue('Test Service Name');
    expect(serviceShortNameTextInp).toHaveValue('Test Short Name');

    const serviceTypeComboBox = screen.getByRole('combobox', { name: /Service type/i });
    expect(serviceTypeComboBox).toBeInTheDocument();
    await user.click(serviceTypeComboBox);
    const serviceTypeOptions = screen.getByRole('option', { name: /Lab service/i });
    expect(serviceTypeOptions).toBeInTheDocument();
    await user.click(serviceTypeOptions);

    // Fill in the default payment option (first one)
    const paymentMethodComboBoxes = screen.getAllByRole('combobox', { name: /Payment mode/i });
    expect(paymentMethodComboBoxes).toHaveLength(1); // Should have one default
    await user.click(paymentMethodComboBoxes[0]);
    const paymentMethodOptions = screen.getByRole('option', { name: /Cash/i });
    expect(paymentMethodOptions).toBeInTheDocument();
    await user.click(paymentMethodOptions);

    const priceTextInps = screen.getAllByRole('textbox', { name: /Selling Price/i });
    expect(priceTextInps).toHaveLength(1); // Should have one price input for the default payment method
    const priceTextInp = priceTextInps[0];
    expect(priceTextInp).toBeInTheDocument();
    await user.type(priceTextInp, '1000');

    mockCreateBillableService.mockReturnValue(Promise.resolve({} as FetchResponse<any>));
    const saveBtn = screen.getAllByRole('button').find((btn) => btn.getAttribute('type') === 'submit');
    expect(saveBtn).toBeInTheDocument();

    await user.click(saveBtn);

    expect(mockCreateBillableService).toHaveBeenCalledTimes(1);
    expect(mockCreateBillableService).toHaveBeenCalledWith({
      name: 'Test Service Name',
      shortName: 'Test Short Name',
      serviceType: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6',
      servicePrices: [
        {
          paymentMode: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
          price: 1000,
          name: 'Cash',
        },
      ],
      serviceStatus: 'ENABLED',
      concept: undefined,
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ to: '/openmrs/spa/billable-services' });
  });

  test("should navigate back to billable services dashboard when 'Cancel' button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    mockUseBillableServices.mockReturnValue({
      billableServices: [],
      isLoading: false,
      error: null,
      mutate: jest.fn(),
      isValidating: false,
    });
    mockUsePaymentModes.mockReturnValue({ paymentModes: mockPaymentModes, error: null, isLoadingPaymentModes: false });
    mockUseServiceTypes.mockReturnValue({ serviceTypes: mockServiceTypes, error: false, isLoadingServiceTypes: false });
    mockUseConceptsSearch.mockReturnValue({ searchResults: [], isSearching: false, error: null });

    render(<AddBillableService onClose={mockOnClose} />);

    const cancelBtn = screen.getAllByRole('button').find((btn) => btn.className.includes('cds--btn--secondary'));
    expect(cancelBtn).toBeInTheDocument();
    await user.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
