import { useCallback, useEffect, useState } from 'react';
import type { BoardState } from './types';
import { loadBoard, makeId, saveBoard } from './storage';

/**
 * Owns the entire board state and exposes typed actions to mutate it.
 * Every change is persisted to localStorage via an effect on `state`.
 */
export function useBoard() {
  const [state, setState] = useState<BoardState>(() => loadBoard());

  useEffect(() => {
    saveBoard(state);
  }, [state]);

  const addCard = useCallback((columnId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState((prev) => {
      const id = makeId();
      return {
        cards: { ...prev.cards, [id]: { id, title: trimmed } },
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, cardIds: [...col.cardIds, id] } : col,
        ),
      };
    });
  }, []);

  const updateCard = useCallback((cardId: string, title: string) => {
    const trimmed = title.trim();
    setState((prev) => {
      const existing = prev.cards[cardId];
      if (!existing || !trimmed) return prev;
      return {
        ...prev,
        cards: { ...prev.cards, [cardId]: { ...existing, title: trimmed } },
      };
    });
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setState((prev) => {
      const cards = { ...prev.cards };
      delete cards[cardId];
      return {
        cards,
        columns: prev.columns.map((col) => ({
          ...col,
          cardIds: col.cardIds.filter((id) => id !== cardId),
        })),
      };
    });
  }, []);

  /**
   * Move a card to `toColumnId` at position `toIndex`. Works both within a
   * column (reorder) and across columns. `toIndex` is clamped to the target
   * length; passing a large number appends.
   */
  const moveCard = useCallback((cardId: string, toColumnId: string, toIndex: number) => {
    setState((prev) => {
      // Remove the card id from wherever it currently lives.
      const columns = prev.columns.map((col) => ({
        ...col,
        cardIds: col.cardIds.filter((id) => id !== cardId),
      }));
      const target = columns.find((col) => col.id === toColumnId);
      if (!target) return prev;
      const index = Math.max(0, Math.min(toIndex, target.cardIds.length));
      target.cardIds = [
        ...target.cardIds.slice(0, index),
        cardId,
        ...target.cardIds.slice(index),
      ];
      return { ...prev, columns };
    });
  }, []);

  const addColumn = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      columns: [...prev.columns, { id: makeId(), title: trimmed, cardIds: [] }],
    }));
  }, []);

  const renameColumn = useCallback((columnId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, title: trimmed } : col,
      ),
    }));
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    setState((prev) => {
      const column = prev.columns.find((col) => col.id === columnId);
      if (!column) return prev;
      const cards = { ...prev.cards };
      for (const id of column.cardIds) delete cards[id];
      return {
        cards,
        columns: prev.columns.filter((col) => col.id !== columnId),
      };
    });
  }, []);

  return {
    state,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    addColumn,
    renameColumn,
    deleteColumn,
  };
}

export type BoardApi = ReturnType<typeof useBoard>;
