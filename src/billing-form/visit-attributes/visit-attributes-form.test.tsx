import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { type BillingConfig } from '../../config-schema';
import { usePaymentMethods } from '../billing-form.resource';
import VisitAttributesForm from './visit-attributes-form.component';

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockUsePaymentMethods = vi.mocked(usePaymentMethods);

vi.mock('../billing-form.resource', () => ({
  usePaymentMethods: vi.fn(),
}));

const attributeTypes = {
  paymentDetails: 'payment-details-attribute-type',
  paymentMethods: 'payment-methods-attribute-type',
  policyNumber: 'policy-number-attribute-type',
  insuranceScheme: 'insurance-scheme-attribute-type',
  patientCategory: 'patient-category-attribute-type',
  formPayloadPending: 'form-payload-pending-attribute-type',
};

const categoryConcepts = {
  payingDetails: 'paying-concept',
  nonPayingDetails: 'non-paying-concept',
  insuranceDetails: 'insurance-payment-mode',
};

const paymentModes = [
  { uuid: 'insurance-payment-mode', name: 'Insurance', description: 'Insurance payment' },
  { uuid: 'cash-payment-mode', name: 'Cash', description: 'Cash payment' },
];

describe('VisitAttributesForm', () => {
  const setAttributes = vi.fn();
  const setPaymentMethod = vi.fn();

  beforeEach(() => {
    mockUseConfig.mockReturnValue({
      patientCategory: attributeTypes,
      categoryConcepts,
      nonPayingPatientCategories: {
        childUnder5: 'child-under-5-concept',
        student: 'student-concept',
      },
    } as BillingConfig);
    mockUsePaymentMethods.mockReturnValue({ paymentModes, isLoading: false, error: null });
  });

  it('reports insurance details as visit attributes for a paying patient', async () => {
    const user = userEvent.setup();
    render(<VisitAttributesForm setAttributes={setAttributes} setPaymentMethod={setPaymentMethod} />);

    expect(screen.queryByRole('combobox', { name: /payment method/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Paying' }));
    await user.click(await screen.findByRole('combobox', { name: /payment method/i }));
    await user.click(await screen.findByText('Insurance'));

    await user.type(await screen.findByLabelText('Insurance scheme'), 'NHIF');
    await user.type(screen.getByLabelText('Policy number'), 'POL-123');

    expect(setPaymentMethod).toHaveBeenLastCalledWith('insurance-payment-mode');
    expect(setAttributes).toHaveBeenLastCalledWith([
      { attributeType: attributeTypes.paymentDetails, value: categoryConcepts.payingDetails },
      { attributeType: attributeTypes.paymentMethods, value: 'insurance-payment-mode' },
      { attributeType: attributeTypes.insuranceScheme, value: 'NHIF' },
      { attributeType: attributeTypes.policyNumber, value: 'POL-123' },
    ]);
  });

  it('hides the insurance fields when a non-insurance payment method is selected', async () => {
    const user = userEvent.setup();
    render(<VisitAttributesForm setAttributes={setAttributes} setPaymentMethod={setPaymentMethod} />);

    await user.click(screen.getByRole('radio', { name: 'Paying' }));
    await user.click(await screen.findByRole('combobox', { name: /payment method/i }));
    await user.click(await screen.findByText('Cash'));

    expect(screen.queryByLabelText('Insurance scheme')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Policy number')).not.toBeInTheDocument();
    expect(setAttributes).toHaveBeenLastCalledWith([
      { attributeType: attributeTypes.paymentDetails, value: categoryConcepts.payingDetails },
      { attributeType: attributeTypes.paymentMethods, value: 'cash-payment-mode' },
    ]);
  });

  it('reports the patient category as a visit attribute for a non-paying patient', async () => {
    const user = userEvent.setup();
    render(<VisitAttributesForm setAttributes={setAttributes} setPaymentMethod={setPaymentMethod} />);

    await user.click(screen.getByRole('radio', { name: /non paying/i }));
    expect(screen.queryByRole('combobox', { name: /payment method/i })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('combobox', { name: /patient category/i }));
    await user.click(await screen.findByText('student'));

    expect(setAttributes).toHaveBeenLastCalledWith([
      { attributeType: attributeTypes.paymentDetails, value: categoryConcepts.nonPayingDetails },
      { attributeType: attributeTypes.patientCategory, value: 'student-concept' },
    ]);
  });
});
