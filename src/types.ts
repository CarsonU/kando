export interface Card {
  id: string;
  title: string;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

/**
 * Normalized board state: columns hold an ordered list of card ids, and the
 * cards themselves live in a lookup map. This keeps moves/reorders to simple
 * splices of id arrays.
 */
export interface BoardState {
  columns: Column[];
  cards: Record<string, Card>;
}

/** Identifies a card being dragged and the column it started in. */
export interface DragSource {
  cardId: string;
  fromColumnId: string;
}
