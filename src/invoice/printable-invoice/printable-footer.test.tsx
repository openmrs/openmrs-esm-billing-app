import React from 'react';
import { screen, render } from '@testing-library/react';
import { useDefaultFacility } from '../../billing.resource';
import PrintableFooter from './printable-footer.component';

const mockUseDefaultFacility = useDefaultFacility as jest.MockedFunction<typeof useDefaultFacility>;

jest.mock('../../billing.resource', () => ({
  useDefaultFacility: jest.fn(),
}));

describe('PrintableFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render PrintableFooter component', () => {
    mockUseDefaultFacility.mockReturnValue({
      data: { display: 'MTRH', uuid: 'mtrh-uuid', links: [] },
    });
    render(<PrintableFooter />);
    const footer = screen.getByText('MTRH');
    expect(footer).toBeInTheDocument();
  });
});
