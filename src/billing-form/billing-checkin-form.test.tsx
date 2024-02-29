import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, render } from '@testing-library/react';
import { useBillableItems, useCashPoint, createPatientBill, usePaymentMethods } from './billing-form.resource';
import BillingCheckInForm from './billing-checkin-form.component';

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
    conceptUuid: '1926AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    conceptName: 'Consultation billable item',
    hasExpiration: false,
    preferredVendorUuid: '359006e7-2669-4204-aee8-27462514b10a',
    preferredVendorName: 'Consolt',
    categoryUuid: '6469ff7e-f8c7-42d6-bff3-ac9605ec99df',
    categoryName: 'Non Drug',
    commonName: 'Consultation',
    acronym: 'CONSULT',
  },
  {
    uuid: 'b47dddd6-4490-4bf7-b694-43bf19d04059',
    conceptUuid: '1926AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    conceptName: 'Lab Testing billable item',
    hasExpiration: false,
    preferredVendorUuid: '359006e7-2669-4204-aee8-27462514b10a',
    preferredVendorName: 'Consolt',
    categoryUuid: '6469ff7e-f8c7-42d6-bff3-ac9605ec99df',
    categoryName: 'Non Drug',
    commonName: 'Lab Testing',
    acronym: 'CONSULT',
  },
];

const mockUseCashPoint = useCashPoint as jest.MockedFunction<typeof useCashPoint>;
const mockUseBillableItems = useBillableItems as jest.MockedFunction<typeof useBillableItems>;
const mockCreatePatientBill = createPatientBill as jest.MockedFunction<typeof createPatientBill>;
const mockusePaymentMethods = usePaymentMethods as jest.MockedFunction<typeof usePaymentMethods>;

jest.mock('./billing-form.resource', () => ({
  useBillableItems: jest.fn(),
  useCashPoint: jest.fn(),
  createPatientBill: jest.fn(),
}));

const testProps = { patientUuid: 'some-patient-uuid', setExtraVisitInfo: jest.fn() };

xdescribe('BillingCheckInForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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

    expect(screen.getByText('Bill service error')).toBeInTheDocument();
    expect(screen.getByText('Error loading bill services')).toBeInTheDocument();
  });

  test('should render the form correctly and generate the required payload', async () => {
    const user = userEvent.setup();
    mockUseCashPoint.mockReturnValue({ cashPoints: [], isLoading: false, error: null });
    mockUseBillableItems.mockReturnValue({ lineItems: mockBillableItems, isLoading: false, error: null });
    renderBillingCheckinForm();

    const paymentTypeSelect = screen.getByRole('group', { name: 'Payment Details' });
    expect(paymentTypeSelect).toBeInTheDocument();

    const paymentTypeRadio = screen.getByRole('radio', { name: 'Paying' });
    expect(paymentTypeRadio).toBeInTheDocument();
    await user.click(paymentTypeRadio);

    const billiableSelect = screen.getByRole('combobox', { name: 'Billable service' });
    expect(billiableSelect).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Billable service' }));

    await user.click(screen.getByText('Lab Testing'));

    expect(testProps.setExtraVisitInfo).toHaveBeenCalled();
    expect(testProps.setExtraVisitInfo).toHaveBeenCalledWith({
      createBillPayload: {
        lineItems: [
          {
            item: 'b47dddd6-4490-4bf7-b694-43bf19d04059',
            quantity: 1,
            price: 500.00001,
            priceName: 'Default',
            priceUuid: '',
            lineItemOrder: 0,
            paymentStatus: 'PENDING',
          },
        ],
        cashPoint: '',
        patient: 'some-patient-uuid',
        status: 'PENDING',
        payments: [],
      },
      handleCreateExtraVisitInfo: expect.anything(),
      attributes: [
        {
          attributeType: 'caf2124f-00a9-4620-a250-efd8535afd6d',
          value: '1c30ee58-82d4-4ea4-a8c1-4bf2f9dfc8cf',
        },
        {
          attributeType: '919b51c9-8e2e-468f-8354-181bf3e55786',
          value: true,
        },
      ],
    });
  });
});

function renderBillingCheckinForm() {
  return render(<BillingCheckInForm {...testProps} />);
}
