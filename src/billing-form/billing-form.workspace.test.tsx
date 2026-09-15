import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useConfig, useVisit } from '@openmrs/esm-framework';
import { type BillingConfig } from '../config-schema';
import { processBillItems, updateBillItems, useBill, useBillableServices } from '../billing.resource';
import { useBillableServices as useBillableServicesList } from '../billable-services/billable-service.resource';
import { useCashPoint } from './billing-form.resource';
import BillingForm from './billing-form.workspace';

// This suite focuses on the department (cash point) selection behavior added to bill creation.
// Broader coverage of the rest of the workspace (editing existing bills, item selection, payment
// methods, etc.) is a pre-existing gap in this file that is out of scope for this change.

const mockUseConfig = vi.mocked(useConfig<BillingConfig>);
const mockUseVisit = vi.mocked(useVisit);
const mockUseBillableServices = vi.mocked(useBillableServices);
const mockUseBill = vi.mocked(useBill);
const mockUseBillableServicesList = vi.mocked(useBillableServicesList);
const mockUseCashPoint = vi.mocked(useCashPoint);
const mockProcessBillItems = vi.mocked(processBillItems);
const mockUpdateBillItems = vi.mocked(updateBillItems);

vi.mock('../billing.resource', () => ({
  processBillItems: vi.fn(),
  updateBillItems: vi.fn(),
  useBill: vi.fn(),
  useBillableServices: vi.fn(),
  patientPaymentStatusCacheKey: vi.fn(() => 'cache-key'),
}));

vi.mock('../billable-services/billable-service.resource', () => ({
  useBillableServices: vi.fn(),
}));

vi.mock('./billing-form.resource', () => ({
  useCashPoint: vi.fn(),
}));

const mockBillableItem = {
  uuid: 'service-1',
  name: 'Consultation',
  shortName: 'Consult',
  serviceStatus: 'ENABLED',
  serviceType: { display: 'Clinical' },
  servicePrices: [{ uuid: 'price-1', name: 'Default', price: 100, paymentMode: { uuid: 'pm-1', name: 'Cash' } }],
};

const mockCashPoints = [
  { uuid: 'pharmacy-uuid', name: 'Pharmacy', description: '', retired: false },
  { uuid: 'lab-uuid', name: 'Laboratory', description: '', retired: false },
];

const workspaceProps = {
  workspaceProps: { patientUuid: 'patient-uuid', onMutate: vi.fn(), billUuid: undefined },
  closeWorkspace: vi.fn(),
};

describe('BillingForm - department selection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseConfig.mockReturnValue({
      defaultCurrency: 'KES',
      postBilledItems: { cashPoint: 'config-default-cashpoint-uuid', cashier: 'cashier-uuid' },
    } as unknown as BillingConfig);
    mockUseVisit.mockReturnValue({ activeVisit: { uuid: 'visit-uuid' } } as any);
    mockUseBillableServices.mockReturnValue({ data: [mockBillableItem], error: null, isLoading: false } as any);
    mockUseBill.mockReturnValue({ bill: null, isLoading: false, error: null } as any);
    mockUseBillableServicesList.mockReturnValue({ billableServices: [], isLoading: false, error: null } as any);
  });

  it('shows a warning and keeps submit disabled when the facility has no departments configured', async () => {
    mockUseCashPoint.mockReturnValue({ cashPoints: [], isLoading: false, error: null });
    render(<BillingForm {...workspaceProps} />);

    expect(screen.getByText(/no departments configured/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^department$/i })).not.toBeInTheDocument();
  });

  it('does not show a department dropdown when the facility has exactly one department', async () => {
    mockUseCashPoint.mockReturnValue({ cashPoints: [mockCashPoints[0]], isLoading: false, error: null });
    render(<BillingForm {...workspaceProps} />);

    expect(screen.queryByRole('combobox', { name: /^department$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/no departments configured/i)).not.toBeInTheDocument();
  });

  it('requires a department to be chosen before the bill can be submitted, when there is more than one', async () => {
    const user = userEvent.setup();
    mockUseCashPoint.mockReturnValue({ cashPoints: mockCashPoints, isLoading: false, error: null });
    render(<BillingForm {...workspaceProps} />);

    expect(screen.getByRole('combobox', { name: /^department$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /search items and services/i }));
    await user.click(await screen.findByText('Consultation'));

    const saveButton = screen.getByRole('button', { name: /save and close/i });
    expect(saveButton).toBeDisabled();
  });

  it('sends the selected department as the cashPoint when submitting a new bill', async () => {
    const user = userEvent.setup();
    mockUseCashPoint.mockReturnValue({ cashPoints: mockCashPoints, isLoading: false, error: null });
    mockProcessBillItems.mockResolvedValue({} as any);
    render(<BillingForm {...workspaceProps} />);

    await user.click(screen.getByRole('combobox', { name: /^department$/i }));
    await user.click(await screen.findByText('Laboratory'));

    await user.click(screen.getByRole('combobox', { name: /search items and services/i }));
    await user.click(await screen.findByText('Consultation'));

    const saveButton = screen.getByRole('button', { name: /save and close/i });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    expect(mockProcessBillItems).toHaveBeenCalledWith(expect.objectContaining({ cashPoint: 'lab-uuid' }));
  });

  it('falls back to the configured default cashPoint only when a department has been auto-selected', async () => {
    const user = userEvent.setup();
    mockUseCashPoint.mockReturnValue({ cashPoints: [mockCashPoints[0]], isLoading: false, error: null });
    mockProcessBillItems.mockResolvedValue({} as any);
    render(<BillingForm {...workspaceProps} />);

    await user.click(screen.getByRole('combobox', { name: /search items and services/i }));
    await user.click(await screen.findByText('Consultation'));

    const saveButton = screen.getByRole('button', { name: /save and close/i });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    expect(mockProcessBillItems).toHaveBeenCalledWith(expect.objectContaining({ cashPoint: 'pharmacy-uuid' }));
  });
});
