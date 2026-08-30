import type { BudgetItem, BudgetPayment } from '../types';
import { n } from './utils';

/**
 * Single source of truth for budget derived values.
 * Every component that displays budget numbers MUST use these functions
 * so the values are guaranteed to match across the Dashboard, Budget Tracker,
 * and any other surface.
 */

/** Total committed = sum of all budget item estimated costs */
export function getTotalCommitted(items: BudgetItem[]): number {
  return items.reduce((s, i) => s + n(i.estimated_cost), 0);
}

/** Total paid = sum of all paid payment records */
export function getTotalPaid(payments: BudgetPayment[]): number {
  return payments.filter(p => p.paid_at).reduce((s, p) => s + n(p.amount), 0);
}

/** Total scheduled = sum of all payment records (paid + unpaid) */
export function getTotalScheduled(payments: BudgetPayment[]): number {
  return payments.reduce((s, p) => s + n(p.amount), 0);
}

/** Budget remaining = total budget - total committed */
export function getBudgetRemaining(totalBudget: number, items: BudgetItem[]): number {
  return totalBudget - getTotalCommitted(items);
}

/**
 * Canonical budget categories. Items with categories NOT in this list
 * are bucketed into "Other" by getCatTotals.
 */
export const CANONICAL_CATEGORIES = [
  'Venue', 'Catering', 'Photography', 'Videography', 'Florals', 'Decor',
  'Attire', 'Beauty', 'Music/DJ', 'Entertainment', 'Invitations',
  'Cake', 'Transportation', 'Planning', 'Rentals', 'Lighting',
  'Favors', 'Honeymoon', 'Miscellaneous', 'Décor',
] as const;

/**
 * Compute category totals, bucketing any unrecognised category into "Other".
 * Returns { totals, categories, total, unmatched } where:
 * - totals: Record<category, amount> including "Other" if present
 * - categories: ordered list of categories that have items
 * - total: sum of all item estimated costs (assertion anchor)
 * - unmatched: sum of items in non-canonical categories (0 if all canonical)
 */
export function getCatTotals(items: BudgetItem[]): {
  totals: Record<string, number>;
  categories: string[];
  total: number;
  unmatched: number;
} {
  const totals: Record<string, number> = {};
  const canonicalSet = new Set<string>(CANONICAL_CATEGORIES);
  let unmatched = 0;

  for (const item of items) {
    const cat = canonicalSet.has(item.category) ? item.category : 'Other';
    if (!canonicalSet.has(item.category)) {
      unmatched += n(item.estimated_cost);
    }
    totals[cat] = (totals[cat] || 0) + n(item.estimated_cost);
  }

  const categories = Object.keys(totals).sort((a, b) => (totals[b] - totals[a]));
  const total = items.reduce((s, i) => s + n(i.estimated_cost), 0);

  return { totals, categories, total, unmatched };
}
