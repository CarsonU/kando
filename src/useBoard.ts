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
        ...prev,
        cards: { ...prev.cards, [id]: { id, title: trimmed, tagIds: [] } },
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
        ...prev,
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

  /** Move a column to a new index in the row (clamped). */
  const moveColumn = useCallback((columnId: string, toIndex: number) => {
    setState((prev) => {
      const from = prev.columns.findIndex((col) => col.id === columnId);
      if (from === -1) return prev;
      const columns = [...prev.columns];
      const [moved] = columns.splice(from, 1);
      const index = Math.max(0, Math.min(toIndex, columns.length));
      columns.splice(index, 0, moved);
      return { ...prev, columns };
    });
  }, []);

  /** Set or clear (pass null) a card's due date. */
  const setCardDueDate = useCallback((cardId: string, dueDate: string | null) => {
    setState((prev) => {
      const existing = prev.cards[cardId];
      if (!existing) return prev;
      const next = { ...existing };
      if (dueDate) next.dueDate = dueDate;
      else delete next.dueDate;
      return { ...prev, cards: { ...prev.cards, [cardId]: next } };
    });
  }, []);

  /** Create a reusable tag and return its id. */
  const createTag = useCallback((name: string, color: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const id = makeId();
    setState((prev) => ({
      ...prev,
      tags: { ...prev.tags, [id]: { id, name: trimmed, color } },
    }));
    return id;
  }, []);

  /** Delete a tag from the palette and remove it from every card. */
  const deleteTag = useCallback((tagId: string) => {
    setState((prev) => {
      const tags = { ...prev.tags };
      delete tags[tagId];
      const cards: typeof prev.cards = {};
      for (const [id, card] of Object.entries(prev.cards)) {
        cards[id] = card.tagIds.includes(tagId)
          ? { ...card, tagIds: card.tagIds.filter((t) => t !== tagId) }
          : card;
      }
      return { ...prev, tags, cards };
    });
  }, []);

  /** Add or remove a tag from a card. */
  const toggleCardTag = useCallback((cardId: string, tagId: string) => {
    setState((prev) => {
      const card = prev.cards[cardId];
      if (!card) return prev;
      const has = card.tagIds.includes(tagId);
      const tagIds = has
        ? card.tagIds.filter((t) => t !== tagId)
        : [...card.tagIds, tagId];
      return { ...prev, cards: { ...prev.cards, [cardId]: { ...card, tagIds } } };
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
        ...prev,
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
    setCardDueDate,
    createTag,
    deleteTag,
    toggleCardTag,
    addColumn,
    renameColumn,
    deleteColumn,
    moveColumn,
  };
}

export type BoardApi = ReturnType<typeof useBoard>;
