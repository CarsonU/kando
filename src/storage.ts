import type { BoardState, Card } from './types';
import { TAG_COLORS } from './palette';

const STORAGE_KEY = 'kanban-board-v1';

/** Generate a reasonably unique id (crypto.randomUUID when available). */
export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** ISO 'YYYY-MM-DD' for `daysFromNow` days from today (local time). */
function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

/** The board shown the very first time, before the user has changed anything. */
export function defaultBoard(): BoardState {
  const tagBug = makeId();
  const tagFeature = makeId();
  const tagDesign = makeId();

  const c1 = makeId();
  const c2 = makeId();
  const c3 = makeId();
  const c4 = makeId();

  const cards: Card[] = [
    { id: c1, title: 'Welcome! Drag a card to another column.', tagIds: [tagFeature] },
    { id: c2, title: 'Double-click a card to edit its text.', tagIds: [] },
    {
      id: c3,
      title: 'Hover a card to add a due date or a tag.',
      tagIds: [tagDesign],
      dueDate: isoDate(3),
    },
    { id: c4, title: 'Drag a column by its handle to reorder.', tagIds: [tagBug], dueDate: isoDate(-1) },
  ];

  return {
    columns: [
      { id: makeId(), title: 'To Do', cardIds: [c1, c2, c3] },
      { id: makeId(), title: 'In Progress', cardIds: [c4] },
      { id: makeId(), title: 'Done', cardIds: [] },
    ],
    cards: Object.fromEntries(cards.map((card) => [card.id, card])),
    tags: {
      [tagBug]: { id: tagBug, name: 'Bug', color: TAG_COLORS[0] },
      [tagFeature]: { id: tagFeature, name: 'Feature', color: TAG_COLORS[3] },
      [tagDesign]: { id: tagDesign, name: 'Design', color: TAG_COLORS[6] },
    },
  };
}

/** Basic shape check so a corrupt value falls back to the default board. */
function isValidBoard(value: unknown): value is Partial<BoardState> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<BoardState>;
  return Array.isArray(v.columns) && typeof v.cards === 'object' && v.cards !== null;
}

/**
 * Backfill fields added after v1 so older saved boards keep working without a
 * destructive migration: ensure `tags` exists and every card has a `tagIds`
 * array.
 */
function normalizeBoard(state: Partial<BoardState>): BoardState {
  const cards = state.cards ?? {};
  for (const id of Object.keys(cards)) {
    const card = cards[id];
    if (!Array.isArray(card.tagIds)) card.tagIds = [];
  }
  return {
    columns: state.columns ?? [],
    cards: cards as BoardState['cards'],
    tags: state.tags ?? {},
  };
}

export function loadBoard(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBoard();
    const parsed: unknown = JSON.parse(raw);
    return isValidBoard(parsed) ? normalizeBoard(parsed) : defaultBoard();
  } catch {
    return defaultBoard();
  }
}

export function saveBoard(state: BoardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode, quota). Fail quietly — the app
    // keeps working in-memory for the session.
  }
}
