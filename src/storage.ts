import type { BoardState } from './types';

const STORAGE_KEY = 'kanban-board-v1';

/** Generate a reasonably unique id (crypto.randomUUID when available). */
export function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The board shown the very first time, before the user has changed anything. */
export function defaultBoard(): BoardState {
  const c1 = makeId();
  const c2 = makeId();
  const c3 = makeId();
  const seed = [
    { id: c1, title: 'Welcome! Drag me to another column.' },
    { id: c2, title: 'Double-click a card to edit its text.' },
    { id: c3, title: 'Add cards with the + at the bottom of a column.' },
  ];
  return {
    columns: [
      { id: makeId(), title: 'To Do', cardIds: [c1, c2, c3] },
      { id: makeId(), title: 'In Progress', cardIds: [] },
      { id: makeId(), title: 'Done', cardIds: [] },
    ],
    cards: Object.fromEntries(seed.map((card) => [card.id, card])),
  };
}

/** Basic shape check so a corrupt/old value falls back to the default board. */
function isValidBoard(value: unknown): value is BoardState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<BoardState>;
  return Array.isArray(v.columns) && typeof v.cards === 'object' && v.cards !== null;
}

export function loadBoard(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBoard();
    const parsed: unknown = JSON.parse(raw);
    return isValidBoard(parsed) ? parsed : defaultBoard();
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
