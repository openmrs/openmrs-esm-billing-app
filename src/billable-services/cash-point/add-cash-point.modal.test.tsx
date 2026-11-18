import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { openmrsFetch, showSnackbar, type FetchResponse } from '@openmrs/esm-framework';
import AddCashPointModal from './add-cash-point.modal';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockShowSnackbar = vi.mocked(showSnackbar);

const locations = [
  { uuid: 'location-1', display: 'Outpatient Clinic' },
  { uuid: 'location-2', display: 'Pharmacy' },
];

const validUuid = '8a5a1c2e-3b4d-4e5f-9a6b-7c8d9e0f1a2b';

describe('AddCashPointModal', () => {
  const closeModal = vi.fn();
  const onCashPointAdded = vi.fn();

  beforeEach(() => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/location')) {
        return Promise.resolve({ data: { results: locations } } as FetchResponse);
      }
      return Promise.resolve({ data: {} } as FetchResponse);
    });
  });

  it('shows validation errors and does not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<AddCashPointModal closeModal={closeModal} onCashPointAdded={onCashPointAdded} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Cash Point Name is required')).toBeInTheDocument();
    expect(screen.getByText('UUID is required')).toBeInTheDocument();
    expect(screen.getByText('Location is required')).toBeInTheDocument();
    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(expect.stringContaining('/billing/cashPoint'), expect.anything());
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('shows a validation error for a malformed UUID', async () => {
    const user = userEvent.setup();
    render(<AddCashPointModal closeModal={closeModal} onCashPointAdded={onCashPointAdded} />);

    await user.type(screen.getByLabelText('Cash Point Name'), 'Pharmacy Cash Point');
    await user.type(screen.getByLabelText('Cash Point UUID'), 'not-a-uuid');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Invalid UUID format')).toBeInTheDocument();
    expect(screen.queryByText('Cash Point Name is required')).not.toBeInTheDocument();
    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(expect.stringContaining('/billing/cashPoint'), expect.anything());
  });

  it('submits the cash point payload and closes the modal', async () => {
    const user = userEvent.setup();
    render(<AddCashPointModal closeModal={closeModal} onCashPointAdded={onCashPointAdded} />);

    await user.type(screen.getByLabelText('Cash Point Name'), 'Pharmacy Cash Point');
    await user.type(screen.getByLabelText('Cash Point UUID'), validUuid);
    await user.click(screen.getByRole('combobox', { name: /cash point location/i }));
    await user.click(await screen.findByText('Pharmacy'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1));
    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      expect.stringContaining('/billing/cashPoint'),
      expect.objectContaining({
        method: 'POST',
        body: { name: 'Pharmacy Cash Point', uuid: validUuid, location: { uuid: 'location-2' } },
      }),
    );
    expect(onCashPointAdded).toHaveBeenCalledTimes(1);
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('keeps the location dropdown controlled when a location is selected and the form resets', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error');
    render(<AddCashPointModal closeModal={closeModal} onCashPointAdded={onCashPointAdded} />);

    await user.type(screen.getByLabelText('Cash Point Name'), 'Pharmacy Cash Point');
    await user.type(screen.getByLabelText('Cash Point UUID'), validUuid);
    await user.click(screen.getByRole('combobox', { name: /cash point location/i }));
    await user.click(await screen.findByText('Pharmacy'));
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1));

    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('downshift'));
    consoleError.mockRestore();
  });

  it('keeps the modal open and shows an error when saving fails', async () => {
    const user = userEvent.setup();
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/location')) {
        return Promise.resolve({ data: { results: locations } } as FetchResponse);
      }
      return Promise.reject(new Error('Duplicate cash point'));
    });
    render(<AddCashPointModal closeModal={closeModal} onCashPointAdded={onCashPointAdded} />);

    await user.type(screen.getByLabelText('Cash Point Name'), 'Pharmacy Cash Point');
    await user.type(screen.getByLabelText('Cash Point UUID'), validUuid);
    await user.click(screen.getByRole('combobox', { name: /cash point location/i }));
    await user.click(await screen.findByText('Outpatient Clinic'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', subtitle: 'Duplicate cash point' }),
      ),
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(onCashPointAdded).not.toHaveBeenCalled();
  });
});
