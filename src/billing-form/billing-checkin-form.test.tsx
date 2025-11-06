import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, render } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { type BillingConfig } from '../config-schema';
import { useBillableItems, useCashPoint, usePaymentMethods } from './billing-form.resource';
import BillingCheckInForm from './billing-checkin-form.component';

const mockUseConfig = jest.mocked(useConfig<BillingConfig>);
const mockUseCashPoint = jest.mocked(useCashPoint);
const mockUseBillableItems = jest.mocked(useBillableItems);
const mockUsePaymentMethods = jest.mocked(usePaymentMethods);

const mockCashPoints = [
  {
    uuid: '54065383-b4d4-42d2-af4d-d250a1fd2590',
    name: 'Cashier 2',
    description: '',
    retired: false,
  },
];

const mockBillableItems = [
  {
    uuid: 'b37dddd6-4490-4bf7-b694-43bf19d04059',
    name: 'Consultation',
    conceptUuid: '1926AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    conceptName: 'Consultation billable item',
    hasExpiration: false,
    preferredVendorUuid: '359006e7-2669-4204-aee8-27462514b10a',
    preferredVendorName: 'Consolt',
    categoryUuid: '6469ff7e-f8c7-42d6-bff3-ac9605ec99df',
    categoryName: 'Non Drug',
    commonName: 'Consultation',
    acronym: 'CONSULT',
    servicePrices: [
      {
        uuid: 'price-1',
        name: 'Default',
        price: '100.00',
        paymentMode: {
          uuid: '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf',
          name: 'Insurance',
        },
      },
    ],
  },
  {
    uuid: 'b47dddd6-4490-4bf7-b694-43bf19d04059',
    name: 'Lab Testing',
    conceptUuid: '1926AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    conceptName: 'Lab Testing billable item',
    hasExpiration: false,
    preferredVendorUuid: '359006e7-2669-4204-aee8-27462514b10a',
    preferredVendorName: 'Consolt',
    categoryUuid: '6469ff7e-f8c7-42d6-bff3-ac9605ec99df',
    categoryName: 'Non Drug',
    commonName: 'Lab Testing',
    acronym: 'CONSULT',
    servicePrices: [
      {
        uuid: 'price-2',
        name: 'Default',
        price: '500.00001',
        paymentMode: {
          uuid: '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf',
          name: 'Insurance',
        },
      },
    ],
  },
];

const mockPaymentMethods = [
  {
    uuid: '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf',
    name: 'Insurance',
    description: 'Insurance payment',
  },
  {
    uuid: '2c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf',
    name: 'Cash',
    description: 'Cash payment',
  },
];

jest.mock('./billing-form.resource', () => ({
  useBillableItems: jest.fn(),
  useCashPoint: jest.fn(),
  createPatientBill: jest.fn(),
  usePaymentMethods: jest.fn(),
}));

const testProps = { patientUuid: 'some-patient-uuid', setExtraVisitInfo: jest.fn() };

describe('BillingCheckInForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseConfig.mockReturnValue({
      patientCategory: {
        paymentDetails: 'fbc0702d-b4c9-4968-be63-af8ad3ad6239',
        paymentMethods: '8553afa0-bdb9-4d3c-8a98-05fa9350aa85',
        policyNumber: '3a988e33-a6c0-4b76-b924-01abb998944b',
        insuranceScheme: 'aac48226-d143-4274-80e0-264db4e368ee',
        patientCategory: '3b9dfac8-9e4d-11ee-8c90-0242ac120002',
        formPayloadPending: '919b51c9-8e2e-468f-8354-181bf3e55786',
      },
      categoryConcepts: {
        payingDetails: '44b34972-6630-4e5a-a9f6-a6eb0f109650',
        nonPayingDetails: 'f3fb2d88-cccd-422c-8766-be101ba7bd2e',
        insuranceDetails: 'beac329b-f1dc-4a33-9e7c-d95821a137a6',
      },
      nonPayingPatientCategories: {
        childUnder5: '1528AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        student: '159465AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
    } as BillingConfig);
    mockUsePaymentMethods.mockReturnValue({ paymentModes: mockPaymentMethods, isLoading: false, error: null });
  });

  test('should show the loading spinner while retrieving data', () => {
    mockUseBillableItems.mockReturnValueOnce({ lineItems: [], isLoading: true, error: null });
    mockUseCashPoint.mockReturnValueOnce({ cashPoints: [], isLoading: true, error: null });
    renderBillingCheckinForm();

    expect(screen.getByText(/Loading billing services.../)).toBeInTheDocument();
  });

  test('should show error state when an error occurs while fetching data', () => {
    const error = new Error('Internal server error');
    mockUseBillableItems.mockReturnValueOnce({ lineItems: [], isLoading: false, error });
    mockUseCashPoint.mockReturnValueOnce({ cashPoints: [], isLoading: false, error });
    renderBillingCheckinForm();

    expect(screen.getByText(/billing service error/i)).toBeInTheDocument();
    expect(screen.getByText(/error loading bill services/i)).toBeInTheDocument();
  });

  test('should render the form correctly and generate the required payload', async () => {
    const user = userEvent.setup();
    mockUseCashPoint.mockReturnValue({ cashPoints: mockCashPoints, isLoading: false, error: null });
    mockUseBillableItems.mockReturnValue({ lineItems: mockBillableItems, isLoading: false, error: null });
    renderBillingCheckinForm();

    const paymentTypeSelect = screen.getByRole('group', { name: /payment details/i });
    expect(paymentTypeSelect).toBeInTheDocument();

    // Select "Paying" radio button
    const paymentTypeRadio = screen.getByRole('radio', { name: 'Paying' });
    expect(paymentTypeRadio).toBeInTheDocument();
    await user.click(paymentTypeRadio);

    // Wait for payment methods dropdown to appear and select a payment method
    const paymentMethodsDropdown = await screen.findByRole('combobox', { name: /payment method/i });
    expect(paymentMethodsDropdown).toBeInTheDocument();
    await user.click(paymentMethodsDropdown);

    // Select "Insurance" payment method
    const insuranceOption = await screen.findByText('Insurance');
    await user.click(insuranceOption);

    // Now select billable service
    const billableSelect = screen.getByRole('combobox', { name: /billable service/i });
    expect(billableSelect).toBeInTheDocument();
    await user.click(billableSelect);

    // Click on Lab Testing option
    const labTestingOption = await screen.findByText(/Lab Testing \(Default: 500\.00001\)/);
    await user.click(labTestingOption);

    expect(testProps.setExtraVisitInfo).toHaveBeenCalled();
    expect(testProps.setExtraVisitInfo).toHaveBeenCalledWith({
      createBillPayload: {
        lineItems: [
          {
            billableService: 'b47dddd6-4490-4bf7-b694-43bf19d04059',
            quantity: 1,
            price: '500.00001',
            priceName: 'Default',
            priceUuid: 'price-2',
            lineItemOrder: 0,
            paymentStatus: 'PENDING',
          },
        ],
        cashPoint: '54065383-b4d4-42d2-af4d-d250a1fd2590',
        patient: 'some-patient-uuid',
        status: 'PENDING',
        payments: [],
      },
      handleCreateExtraVisitInfo: expect.anything(),
      attributes: expect.arrayContaining([
        expect.objectContaining({
          attributeType: 'fbc0702d-b4c9-4968-be63-af8ad3ad6239',
          value: '44b34972-6630-4e5a-a9f6-a6eb0f109650',
        }),
        expect.objectContaining({
          attributeType: '8553afa0-bdb9-4d3c-8a98-05fa9350aa85',
          value: '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf',
        }),
      ]),
    });
  });
});

function renderBillingCheckinForm() {
  return render(<BillingCheckInForm {...testProps} />);
}
