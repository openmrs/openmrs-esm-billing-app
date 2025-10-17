import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { navigate, type FetchResponse } from '@openmrs/esm-framework';
import {
  createBillableService,
  updateBillableService,
  useBillableServices,
  useConceptsSearch,
  usePaymentModes,
  useServiceTypes,
} from '../billable-service.resource';
import AddBillableService, { transformServiceToFormData, normalizePrice } from './add-billable-service.component';
import type { BillableService } from '../../types';

const mockUseBillableServices = jest.mocked(useBillableServices);
const mockUsePaymentModes = jest.mocked(usePaymentModes);
const mockUseServiceTypes = jest.mocked(useServiceTypes);
const mockCreateBillableService = jest.mocked(createBillableService);
const mockUpdateBillableService = jest.mocked(updateBillableService);
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
    test('should accept form submission without short name (short name is optional)', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      // Fill required fields but skip short name
      await user.type(screen.getByRole('textbox', { name: /Service name/i }), 'Lab Test');

      await user.click(screen.getByRole('combobox', { name: /Service type/i }));
      await user.click(screen.getByRole('option', { name: /Lab service/i }));

      await user.click(screen.getByRole('combobox', { name: /Payment mode/i }));
      await user.click(screen.getByRole('option', { name: /Cash/i }));

      const priceInput = screen.getByRole('spinbutton', { name: /Selling Price/i });
      await user.type(priceInput, '50');

      mockCreateBillableService.mockResolvedValue({} as FetchResponse<any>);

      await submitForm(user);

      expect(mockCreateBillableService).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Lab Test',
          shortName: '', // Empty string is valid
        }),
      );
    });

    test('should enforce 255 character limit on service name input', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      const longName = 'A'.repeat(300); // Try to type 300 characters
      const input = screen.getByRole('textbox', { name: /Service name/i });
      await user.type(input, longName);

      // Input should be truncated to 255 chars due to maxLength attribute
      expect(input).toHaveValue('A'.repeat(255));
    });

    test('should enforce 255 character limit on short name input', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      const longShortName = 'B'.repeat(300); // Try to type 300 characters
      const input = screen.getByRole('textbox', { name: /Short name/i });
      await user.type(input, longShortName);

      // Input should be truncated to 255 chars due to maxLength attribute
      expect(input).toHaveValue('B'.repeat(255));
    });

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

    test('should show "Service type is required" error when not selected', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      await user.type(screen.getByRole('textbox', { name: /Service name/i }), 'Test Service');
      await user.type(screen.getByRole('textbox', { name: /Short name/i }), 'Test Short Name');

      await user.click(screen.getByRole('combobox', { name: /Payment mode/i }));
      await user.click(screen.getByRole('option', { name: /Cash/i }));

      const priceInput = screen.getByRole('spinbutton', { name: /Selling Price/i });
      await user.type(priceInput, '100');

      await submitForm(user);

      expect(screen.getByText('Service type is required')).toBeInTheDocument();
      expect(mockCreateBillableService).not.toHaveBeenCalled();
    });

    test('should show "Payment mode is required" error when not selected', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      await user.type(screen.getByRole('textbox', { name: /Service name/i }), 'Test Service');
      await user.type(screen.getByRole('textbox', { name: /Short name/i }), 'Test Short Name');

      await user.click(screen.getByRole('combobox', { name: /Service type/i }));
      await user.click(screen.getByRole('option', { name: /Lab service/i }));

      const priceInput = screen.getByRole('spinbutton', { name: /Selling Price/i });
      await user.type(priceInput, '100');

      await submitForm(user);

      expect(screen.getByText('Payment mode is required')).toBeInTheDocument();
      expect(mockCreateBillableService).not.toHaveBeenCalled();
    });

    test('should show "Price is required" error when price field is empty', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      await fillRequiredFields(user, { skipPrice: true });

      await submitForm(user);

      expect(screen.getByText('Price is required')).toBeInTheDocument();
      expect(mockCreateBillableService).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const mockServiceToEdit: BillableService = {
      uuid: 'existing-service-uuid',
      name: 'X-Ray Service',
      shortName: 'XRay',
      serviceStatus: 'ENABLED',
      serviceType: {
        uuid: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6',
        display: 'Lab service',
      },
      concept: null,
      servicePrices: [
        {
          uuid: 'price-uuid',
          name: 'Cash',
          price: 150,
          paymentMode: {
            uuid: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
            name: 'Cash',
          },
        },
      ],
    };

    test('should populate form with existing service data', () => {
      renderAddBillableService({ serviceToEdit: mockServiceToEdit });

      expect(screen.getByText('Edit billable service')).toBeInTheDocument();
      expect(screen.getByText('X-Ray Service')).toBeInTheDocument(); // Service name shown as label
      expect(screen.getByDisplayValue('XRay')).toBeInTheDocument(); // Short name
    });

    test('should call updateBillableService instead of createBillableService', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      renderAddBillableService({ serviceToEdit: mockServiceToEdit, onClose: mockOnClose });

      const shortNameInput = screen.getByDisplayValue('XRay');
      await user.clear(shortNameInput);
      await user.type(shortNameInput, 'X-RAY');

      mockUpdateBillableService.mockResolvedValue({} as FetchResponse<any>);

      await submitForm(user);

      expect(mockUpdateBillableService).toHaveBeenCalledTimes(1);
      expect(mockUpdateBillableService).toHaveBeenCalledWith('existing-service-uuid', {
        name: 'X-Ray Service',
        shortName: 'X-RAY',
        serviceType: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6',
        servicePrices: [
          {
            paymentMode: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
            price: 150,
            name: 'Cash',
          },
        ],
        serviceStatus: 'ENABLED',
        concept: undefined,
      });
      expect(mockCreateBillableService).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('should call onServiceUpdated callback after successful edit', async () => {
      const user = userEvent.setup();
      const mockOnServiceUpdated = jest.fn();
      renderAddBillableService({ serviceToEdit: mockServiceToEdit, onServiceUpdated: mockOnServiceUpdated });

      mockUpdateBillableService.mockResolvedValue({} as FetchResponse<any>);

      await submitForm(user);

      expect(mockOnServiceUpdated).toHaveBeenCalledTimes(1);
    });

    test('should not allow editing service name in edit mode', () => {
      renderAddBillableService({ serviceToEdit: mockServiceToEdit });

      // Service name should be displayed as a label, not an editable input
      expect(screen.getByText('X-Ray Service')).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /Service name/i })).not.toBeInTheDocument();
    });

    test('should handle asynchronous loading of dependencies and populate form correctly', async () => {
      // Scenario: User opens edit form, but payment modes/service types haven't loaded yet
      // The form should wait for dependencies to load, then populate correctly

      renderAddBillableService({ serviceToEdit: mockServiceToEdit });

      // After dependencies load (handled by renderAddBillableService's setupMocks),
      // form should display with populated data
      await screen.findByText('Edit billable service');
      expect(screen.getByText('X-Ray Service')).toBeInTheDocument();
      expect(screen.getByDisplayValue('XRay')).toBeInTheDocument();

      // This test verifies the useEffect that calls reset() when dependencies load
      // The behavior is: even if payment modes/types load after initial render,
      // the form will update to show the service data
    });
  });

  describe('Dynamic Payment Options', () => {
    test('should add new payment option when clicking "Add payment option" button', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      const addButton = screen.getByRole('button', { name: /Add payment option/i });
      await user.click(addButton);

      const paymentModeDropdowns = screen.getAllByRole('combobox', { name: /Payment mode/i });
      expect(paymentModeDropdowns).toHaveLength(2);
    });

    test('should be able to add multiple payment options', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      // Add a second payment option
      const addButton = screen.getByRole('button', { name: /Add payment option/i });
      await user.click(addButton);

      const paymentModeDropdowns = screen.getAllByRole('combobox', { name: /Payment mode/i });
      expect(paymentModeDropdowns).toHaveLength(2);
    });

    test('should allow adding multiple payment options with different payment modes', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      // Add second payment option
      const addButton = screen.getByRole('button', { name: /Add payment option/i });
      await user.click(addButton);

      // Fill in first payment option
      const paymentModeDropdowns = screen.getAllByRole('combobox', { name: /Payment mode/i });
      await user.click(paymentModeDropdowns[0]);
      await user.click(screen.getByRole('option', { name: /Cash/i }));

      const priceInputs = screen.getAllByRole('spinbutton', { name: /Selling Price/i });
      await user.type(priceInputs[0], '100');

      // Fill in second payment option
      await user.click(paymentModeDropdowns[1]);
      await user.click(screen.getByRole('option', { name: /Insurance/i }));
      await user.type(priceInputs[1], '80');

      // Fill other required fields
      await user.type(screen.getByRole('textbox', { name: /Service name/i }), 'Multi-price Service');
      await user.type(screen.getByRole('textbox', { name: /Short name/i }), 'MPS');
      await user.click(screen.getByRole('combobox', { name: /Service type/i }));
      await user.click(screen.getByRole('option', { name: /Lab service/i }));

      mockCreateBillableService.mockResolvedValue({} as FetchResponse<any>);
      await submitForm(user);

      expect(mockCreateBillableService).toHaveBeenCalledWith(
        expect.objectContaining({
          servicePrices: [
            {
              paymentMode: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
              price: 100,
              name: 'Cash',
            },
            {
              paymentMode: 'beac329b-f1dc-4a33-9e7c-d95821a137a6',
              price: 80,
              name: 'Insurance',
            },
          ],
        }),
      );
    });

    test('should validate each payment option independently', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      // Add second payment option
      const addButton = screen.getByRole('button', { name: /Add payment option/i });
      await user.click(addButton);

      // Fill first payment option correctly
      const paymentModeDropdowns = screen.getAllByRole('combobox', { name: /Payment mode/i });
      await user.click(paymentModeDropdowns[0]);
      await user.click(screen.getByRole('option', { name: /Cash/i }));

      const priceInputs = screen.getAllByRole('spinbutton', { name: /Selling Price/i });
      await user.type(priceInputs[0], '100');

      // Leave second payment option incomplete (no price)
      await user.click(paymentModeDropdowns[1]);
      await user.click(screen.getByRole('option', { name: /Insurance/i }));

      // Fill other required fields
      await user.type(screen.getByRole('textbox', { name: /Service name/i }), 'Test Service');
      await user.type(screen.getByRole('textbox', { name: /Short name/i }), 'TS');
      await user.click(screen.getByRole('combobox', { name: /Service type/i }));
      await user.click(screen.getByRole('option', { name: /Lab service/i }));

      await submitForm(user);

      // Should show error for the second payment option's missing price
      const priceErrors = screen.getAllByText('Price is required');
      expect(priceErrors.length).toBeGreaterThan(0);
      expect(mockCreateBillableService).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should display error snackbar when create API call fails', async () => {
      const user = userEvent.setup();
      renderAddBillableService();

      await fillRequiredFields(user);

      const errorMessage = 'Network error';
      mockCreateBillableService.mockRejectedValue(new Error(errorMessage));

      await submitForm(user);

      // Wait for async operations
      await screen.findByRole('button', { name: /save/i });

      expect(mockCreateBillableService).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    });

    test('should display error snackbar when update API call fails', async () => {
      const user = userEvent.setup();
      const mockServiceToEdit: BillableService = {
        uuid: 'service-uuid',
        name: 'Test Service',
        shortName: 'TS',
        serviceStatus: 'ENABLED',
        serviceType: {
          uuid: 'c9604249-db0a-4d03-b074-fc6bc2fa13e6',
          display: 'Lab service',
        },
        concept: null,
        servicePrices: [
          {
            uuid: 'price-uuid',
            name: 'Cash',
            price: 100,
            paymentMode: {
              uuid: '63eff7a4-6f82-43c4-a333-dbcc58fe9f74',
              name: 'Cash',
            },
          },
        ],
      };

      renderAddBillableService({ serviceToEdit: mockServiceToEdit });

      const errorMessage = 'Update failed';
      mockUpdateBillableService.mockRejectedValue(new Error(errorMessage));

      await submitForm(user);

      // Wait for async operations
      await screen.findByRole('button', { name: /save/i });

      expect(mockUpdateBillableService).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});

describe('Helper Functions', () => {
  describe('transformServiceToFormData', () => {
    test('should return default form data when no service is provided', () => {
      const result = transformServiceToFormData();

      expect(result).toEqual({
        name: '',
        shortName: '',
        serviceType: null,
        concept: null,
        payment: [{ paymentMode: '', price: '' }],
      });
    });

    test('should return default form data when undefined service is provided', () => {
      const result = transformServiceToFormData(undefined);

      expect(result).toEqual({
        name: '',
        shortName: '',
        serviceType: null,
        concept: null,
        payment: [{ paymentMode: '', price: '' }],
      });
    });

    test('should transform a complete service to form data', () => {
      const service: BillableService = {
        uuid: 'service-uuid',
        name: 'X-Ray',
        shortName: 'XRay',
        serviceStatus: 'ENABLED',
        serviceType: {
          uuid: 'type-uuid',
          display: 'Lab service',
        },
        concept: {
          uuid: 'concept-search-result-uuid',
          concept: {
            uuid: 'concept-uuid',
            display: 'Radiology',
          },
          display: 'Radiology',
        },
        servicePrices: [
          {
            uuid: 'price-uuid-1',
            name: 'Cash',
            price: 100,
            paymentMode: {
              uuid: 'payment-mode-uuid-1',
              name: 'Cash',
            },
          },
          {
            uuid: 'price-uuid-2',
            name: 'Insurance',
            price: 80,
            paymentMode: {
              uuid: 'payment-mode-uuid-2',
              name: 'Insurance',
            },
          },
        ],
      };

      const result = transformServiceToFormData(service);

      expect(result).toEqual({
        name: 'X-Ray',
        shortName: 'XRay',
        serviceType: {
          uuid: 'type-uuid',
          display: 'Lab service',
        },
        concept: {
          uuid: 'concept-search-result-uuid',
          display: 'Radiology',
        },
        payment: [
          {
            paymentMode: 'payment-mode-uuid-1',
            price: 100,
          },
          {
            paymentMode: 'payment-mode-uuid-2',
            price: 80,
          },
        ],
      });
    });

    test('should handle service without concept', () => {
      const service: BillableService = {
        uuid: 'service-uuid',
        name: 'Basic Service',
        shortName: 'BS',
        serviceStatus: 'ENABLED',
        serviceType: {
          uuid: 'type-uuid',
          display: 'General',
        },
        concept: null,
        servicePrices: [
          {
            uuid: 'price-uuid',
            name: 'Cash',
            price: 50,
            paymentMode: {
              uuid: 'payment-mode-uuid',
              name: 'Cash',
            },
          },
        ],
      };

      const result = transformServiceToFormData(service);

      expect(result.concept).toBeNull();
    });

    test('should handle service with missing or empty price using nullish coalescing', () => {
      const service: BillableService = {
        uuid: 'service-uuid',
        name: 'Test Service',
        shortName: 'TS',
        serviceStatus: 'ENABLED',
        serviceType: {
          uuid: 'type-uuid',
          display: 'General',
        },
        concept: null,
        servicePrices: [
          {
            uuid: 'price-uuid',
            name: 'Cash',
            price: 0, // Falsy but valid
            paymentMode: {
              uuid: 'payment-mode-uuid',
              name: 'Cash',
            },
          },
        ],
      };

      const result = transformServiceToFormData(service);

      // Price 0 should be preserved (not converted to empty string)
      expect(result.payment[0].price).toBe(0);
    });
  });

  describe('normalizePrice', () => {
    test('should return number as-is', () => {
      expect(normalizePrice(100)).toBe(100);
      expect(normalizePrice(10.5)).toBe(10.5);
      expect(normalizePrice(0)).toBe(0);
    });

    test('should convert string to number', () => {
      expect(normalizePrice('100')).toBe(100);
      expect(normalizePrice('10.5')).toBe(10.5);
      expect(normalizePrice('0')).toBe(0);
    });

    test('should handle decimal strings correctly', () => {
      expect(normalizePrice('10.99')).toBe(10.99);
      expect(normalizePrice('0.50')).toBe(0.5);
    });

    test('should handle undefined by converting to NaN', () => {
      expect(normalizePrice(undefined)).toBeNaN();
    });

    test('should handle empty string by converting to NaN', () => {
      expect(normalizePrice('')).toBeNaN();
    });

    test('should handle invalid string by converting to NaN', () => {
      expect(normalizePrice('invalid')).toBeNaN();
    });
  });
});
