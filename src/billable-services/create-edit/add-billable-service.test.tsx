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

// Test helpers (canonical pattern)
const setupMocks = () => {
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
};

const renderAddBillableService = (props = {}) => {
  const defaultProps = {
    onClose: jest.fn(),
    ...props,
  };
  setupMocks();
  return render(<AddBillableService {...defaultProps} />);
};

interface FillOptions {
  serviceName?: string;
  shortName?: string;
  skipPrice?: boolean;
}

const fillRequiredFields = async (user, options: FillOptions = {}) => {
  const { serviceName = 'Test Service Name', shortName = 'Test Short Name', skipPrice = false } = options;

  if (serviceName) {
    await user.type(screen.getByRole('textbox', { name: /Service name/i }), serviceName);
  }
  if (shortName) {
    await user.type(screen.getByRole('textbox', { name: /Short name/i }), shortName);
  }

  await user.click(screen.getByRole('combobox', { name: /Service type/i }));
  await user.click(screen.getByRole('option', { name: /Lab service/i }));

  await user.click(screen.getByRole('combobox', { name: /Payment mode/i }));
  await user.click(screen.getByRole('option', { name: /Cash/i }));

  if (!skipPrice) {
    const priceInput = screen.getByRole('spinbutton', { name: /Selling Price/i });
    await user.type(priceInput, '100');
  }
};

const submitForm = async (user) => {
  const saveBtn = screen.getByRole('button', { name: /save/i });
  await user.click(saveBtn);
};

describe('AddBillableService', () => {
  test('should render billable services form and generate correct payload', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    renderAddBillableService({ onClose: mockOnClose });

    const formTitle = screen.getByRole('heading', { name: /Add billable service/i });
    expect(formTitle).toBeInTheDocument();

    await fillRequiredFields(user);
    mockCreateBillableService.mockResolvedValue({} as FetchResponse<any>);

    await submitForm(user);

    expect(mockCreateBillableService).toHaveBeenCalledTimes(1);
    expect(mockCreateBillableService).toHaveBeenCalledWith({
      name: 'Test Service Name',
      shortName: 'Test Short Name',
      serviceType: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6',
      servicePrices: [
        {
          paymentMode: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
          price: 100,
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
    renderAddBillableService({ onClose: mockOnClose });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  describe('Form Validation', () => {
    test('should show "Price must be greater than 0" error for zero price', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      await fillRequiredFields(user, { skipPrice: true });

      const priceInput = screen.getByRole('spinbutton', { name: /selling price/i });
      await user.type(priceInput, '0');

      await submitForm(user);

      expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
      expect(mockCreateBillableService).not.toHaveBeenCalled();
    });

    test('should show "Price must be greater than 0" error for negative price', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      await fillRequiredFields(user, { skipPrice: true });

      const priceInput = screen.getByRole('spinbutton', { name: /Selling Price/i });
      await user.type(priceInput, '-10');

      await submitForm(user);

      expect(screen.getByText('Price must be greater than 0')).toBeInTheDocument();
      expect(mockCreateBillableService).not.toHaveBeenCalled();
    });

    test('should show "Service name is required" error when service name is empty', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      // Fill all fields except service name
      await user.type(screen.getByRole('textbox', { name: /Short name/i }), 'Test Short Name');

      await user.click(screen.getByRole('combobox', { name: /Service type/i }));
      await user.click(screen.getByRole('option', { name: /Lab service/i }));

      await user.click(screen.getByRole('combobox', { name: /Payment mode/i }));
      await user.click(screen.getByRole('option', { name: /Cash/i }));

      const priceInput = screen.getByRole('spinbutton', { name: /Selling Price/i });
      await user.type(priceInput, '100');

      await submitForm(user);

      expect(screen.getByText('Service name is required')).toBeInTheDocument();
      expect(mockCreateBillableService).not.toHaveBeenCalled();
    });

    test('should accept valid decimal price values', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      await fillRequiredFields(user, { skipPrice: true });

      const priceInput = screen.getByRole('spinbutton', { name: /selling price/i });
      await user.type(priceInput, '10.50');

      mockCreateBillableService.mockResolvedValue({} as FetchResponse<any>);

      await submitForm(user);

      expect(screen.queryByText('Price is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Price must be greater than 0')).not.toBeInTheDocument();
      expect(mockCreateBillableService).toHaveBeenCalledTimes(1);
      expect(mockCreateBillableService).toHaveBeenCalledWith({
        name: 'Test Service Name',
        shortName: 'Test Short Name',
        serviceType: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6',
        servicePrices: [
          {
            paymentMode: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
            price: 10.5,
            name: 'Cash',
          },
        ],
        serviceStatus: 'ENABLED',
        concept: undefined,
      });
    });
  });
});
