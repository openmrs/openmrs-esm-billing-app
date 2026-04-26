import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import { useDefaultFacility } from '../../billing.resource';
import PrintableFooter from './printable-footer.component';

const mockUseDefaultFacility = vi.mocked<typeof useDefaultFacility>(useDefaultFacility);

vi.mock('../../billing.resource', () => ({
  useDefaultFacility: vi.fn(),
}));

describe('PrintableFooter', () => {
  it('should render PrintableFooter component', () => {
    mockUseDefaultFacility.mockReturnValue({
      data: { display: 'MTRH', uuid: 'mtrh-uuid', links: [] },
    });
    render(<PrintableFooter />);
    const footer = screen.getByText('MTRH');
    expect(footer).toBeInTheDocument();
  });
});
