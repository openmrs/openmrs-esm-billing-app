import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BillableCommodity } from '../types';
import {
  buildBillableCommodityPricePayload,
  CommoditySearchError,
  createBillableCommoditySchema,
  isDuplicateCommodityPrice,
} from './billable-commodity-form.workspace';

const t = ((_key: string, fallback: string) => fallback) as TFunction;

describe('createBillableCommoditySchema', () => {
  it('accepts different payment modes for the same commodity', () => {
    const result = createBillableCommoditySchema(t).safeParse({
      payment: [
        { paymentMode: 'cash', price: 100 },
        { paymentMode: 'insurance', price: 120 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a repeated payment mode', () => {
    const result = createBillableCommoditySchema(t).safeParse({
      payment: [
        { paymentMode: 'cash', price: 100 },
        { paymentMode: 'cash', price: 120 },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['payment', 1, 'paymentMode'],
          message: 'Each payment mode can only be selected once',
        }),
      );
    }
  });
});

describe('buildBillableCommodityPricePayload', () => {
  it('does not include the item name in an update payload', () => {
    const payload = buildBillableCommodityPricePayload({ paymentMode: 'cash-uuid', price: '100' }, [
      { uuid: 'cash-uuid', name: 'Cash', description: '', links: [], resourceVersion: '' },
    ]);

    expect(payload).toEqual({
      name: 'Cash',
      price: 100,
      paymentMode: {
        uuid: 'cash-uuid',
        name: 'Cash',
      },
    });
    expect(payload).not.toHaveProperty('item');
  });
});

describe('isDuplicateCommodityPrice', () => {
  const existingPrices: BillableCommodity[] = [
    {
      uuid: 'price-uuid',
      item: 'Paracetamol 500mg',
      price: 100,
      paymentMode: { uuid: 'cash-uuid', name: 'Cash' },
    },
  ];

  it('detects an existing item and payment-mode pair', () => {
    expect(isDuplicateCommodityPrice(existingPrices, ' paracetamol 500MG ', 'cash-uuid')).toBe(true);
  });

  it('allows another payment mode for the same item', () => {
    expect(isDuplicateCommodityPrice(existingPrices, 'Paracetamol 500mg', 'insurance-uuid')).toBe(false);
  });

  it('excludes the price currently being edited', () => {
    expect(isDuplicateCommodityPrice(existingPrices, 'Paracetamol 500mg', 'cash-uuid', 'price-uuid')).toBe(false);
  });
});

describe('CommoditySearchError', () => {
  it('shows a search failure and retries the request', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();

    render(React.createElement(CommoditySearchError, { onRetry, t }));

    expect(screen.getByText('Unable to search commodities')).toBeInTheDocument();
    expect(screen.getByText('Commodity search failed. Please try again.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
