import type { Card } from './types';

/** Order two ISO 'YYYY-MM-DD' due dates ascending; undated cards sort last. */
export function compareDue(a?: string, b?: string): number {
  if (a && b) return a < b ? -1 : a > b ? 1 : 0;
  if (a) return -1;
  if (b) return 1;
  return 0;
}

/**
 * Apply the board's non-destructive view ordering to a list of card ids:
 * optionally sort by due date, then always float priority cards to the top.
 * Each step is stable, so cards keep their incoming relative order otherwise.
 * The input array is never mutated.
 */
export function orderCards(
  ids: string[],
  cards: Record<string, Card>,
  opts: { sortByDue: boolean },
): string[] {
  let out = ids;
  if (opts.sortByDue) {
    out = [...out].sort((a, b) => compareDue(cards[a]?.dueDate, cards[b]?.dueDate));
  }
  const priority = out.filter((id) => cards[id]?.priority);
  if (priority.length === 0 || priority.length === out.length) return out;
  const rest = out.filter((id) => !cards[id]?.priority);
  return [...priority, ...rest];
}
