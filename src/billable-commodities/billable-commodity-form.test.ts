import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { createBillableCommoditySchema } from './billable-commodity-form.workspace';

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
