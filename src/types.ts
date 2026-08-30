export interface Tag {
  id: string;
  name: string;
  /** A color value drawn from the preset palette (see palette.ts). */
  color: string;
}

export interface Card {
  id: string;
  title: string;
  /** ISO date 'YYYY-MM-DD', or undefined when no due date is set. */
  dueDate?: string;
  /** Ids of tags (from BoardState.tags) assigned to this card. */
  tagIds: string[];
  /** ISO timestamp set when the card is archived; absent for active cards. */
  archivedAt?: string;
  /** Id of the column the card was archived from (used to restore it). */
  archivedFrom?: string;
  /** True when the card is flagged priority; absent/false otherwise. */
  priority?: boolean;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

/**
 * Normalized board state: columns hold an ordered list of card ids, cards live
 * in a lookup map, and tags are a shared, reusable palette referenced by cards.
 * This keeps card moves/reorders to simple splices of id arrays.
 */
export interface BoardState {
  columns: Column[];
  cards: Record<string, Card>;
  tags: Record<string, Tag>;
}

/** Identifies a card being dragged and the column it started in. */
export interface DragSource {
  cardId: string;
  fromColumnId: string;
}
