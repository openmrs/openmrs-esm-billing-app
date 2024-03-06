import { calculateTotalAmount, convertToCurrency } from '../helpers';
import { type MappedBill } from '../types';

/**
 * A custom hook for calculating bill metrics.
 *
 * This hook takes in an array of bills and calculates the total amount for different
 * bill statuses (cumulative, pending, paid) using provided helper functions.
 *
 * @param {Array<Object>} bills - An array of bill objects. Each bill object should have a `status` and `lineItems` properties.
 *
 * @returns {{
 *   cumulativeBills: string,
 *   pendingBills: string,
 *   paidBills: string
 * }}
 */

export const useBillMetrics = (bills: Array<MappedBill>) => {
  const { paidTotal, pendingTotal, cumulativeTotal } = calculateBillTotals(bills);
  return {
    cumulativeBills: cumulativeTotal,
    pendingBills: pendingTotal,
    paidBills: paidTotal,
  };
};

const calculateBillTotals = (bills: Array<MappedBill>) => {
  let paidTotal = 0;
  let pendingTotal = 0;
  let cumulativeTotal = 0;

  bills.forEach((bill) => {
    if (bill?.status === 'PAID') {
      paidTotal += bill?.totalAmount;
    } else if (bill?.status === 'PENDING') {
      pendingTotal += bill?.totalAmount;
    }
    cumulativeTotal += bill?.totalAmount; // Add to cumulative total regardless of status
  });

  return { paidTotal, pendingTotal, cumulativeTotal };
};

export default calculateBillTotals;
