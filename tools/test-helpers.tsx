import React from 'react';
import { SWRConfig } from 'swr';
import { render, screen, waitForElementToBeRemoved, waitFor } from '@testing-library/react';

const swrWrapper = ({ children }) => {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 0,
        provider: () => new Map(),
      }}>
      {children}
    </SWRConfig>
  );
};

export const renderWithSwr = (ui, options?) => render(ui, { wrapper: swrWrapper, ...options });

export async function waitForLoadingToFinish() {
  const loaders = screen.queryAllByRole('progressbar');
  if (loaders.length > 0) {
    await waitForElementToBeRemoved(() => [...screen.queryAllByRole('progressbar')], {
      timeout: 4000,
    });
  }
  // Wait for any pending async state updates to complete
  await waitFor(() => {}, { timeout: 100 }).catch(() => {});
}
