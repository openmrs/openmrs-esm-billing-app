import { createContext } from 'react';
import type { OpenmrsResource } from '@openmrs/esm-framework';

interface SelectedCashPointContextType {
  selectedCashPoint: OpenmrsResource | null;
  setSelectedCashPoint: (cashPoint: OpenmrsResource | null) => void;
}

const SelectedCashPointContext = createContext<SelectedCashPointContextType>({
  selectedCashPoint: null,
  setSelectedCashPoint: () => {},
});

export default SelectedCashPointContext;
