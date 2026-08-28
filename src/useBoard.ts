import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardState } from './types';
import { loadBoard, makeId, saveBoard } from './storage';
import { fetchBoard, fetchVersion, saveBoardRemote } from './api';

/** Connection state to the persistence server, surfaced in the header. */
export type SyncStatus = 'connecting' | 'synced' | 'saving' | 'offline';

const SAVE_DEBOUNCE_MS = 500;
const POLL_INTERVAL_MS = 2000;

/**
 * Owns the entire board state and exposes typed actions to mutate it.
 *
 * The server is the source of truth: on mount we paint from the localStorage
 * cache (instant), then hydrate from the server. Local changes are cached to
 * localStorage immediately and pushed to the server (debounced). A poll pulls
 * in changes made on other devices. localStorage is only an offline cache — if
 * the server is unreachable the app keeps working locally and re-syncs later.
 */
export function useBoard() {
  const [state, setState] = useState<BoardState>(() => loadBoard());
  const [status, setStatus] = useState<SyncStatus>('connecting');

  // Sync bookkeeping (refs so they don't trigger renders).
  const versionRef = useRef(-1); // last server version we've seen
  const dirtyRef = useRef(false); // local changes not yet confirmed saved
  const savingRef = useRef(false); // a PUT is in flight
  const hydratedRef = useRef(false); // initial server load has settled
  const skipSaveRef = useRef(false); // next state change came FROM the server
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Apply a board received from the server without echoing it back as a save. */
  const applyRemote = useCallback((board: BoardState, version: number) => {
    skipSaveRef.current = true;
    versionRef.current = version;
    dirtyRef.current = false;
    saveBoard(board); // keep the offline cache warm
    setState(board);
  }, []);

  // Initial hydrate from the server (localStorage has already painted).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { version, board } = await fetchBoard();
        if (cancelled) return;
        if (board) {
          applyRemote(board, version); // server wins on load
        } else {
          // Server has no board yet — seed it from what we have locally.
          const v = await saveBoardRemote(state);
          if (cancelled) return;
          versionRef.current = v;
        }
        setStatus('synced');
      } catch {
        if (!cancelled) setStatus('offline');
      } finally {
        hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount; `state` here is the initial cached/default board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist changes: cache locally right away, then push to the server (debounced).
  useEffect(() => {
    if (skipSaveRef.current) {
      // This change came from applyRemote — don't send it straight back.
      skipSaveRef.current = false;
      return;
    }
    saveBoard(state); // always keep the local cache current
    if (!hydratedRef.current) return; // wait until we know the server's state

    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      savingRef.current = true;
      setStatus((s) => (s === 'offline' ? s : 'saving'));
      try {
        versionRef.current = await saveBoardRemote(state);
        dirtyRef.current = false;
        setStatus('synced');
      } catch {
        setStatus('offline'); // leave dirty set so a later change retries
      } finally {
        savingRef.current = false;
      }
    }, SAVE_DEBOUNCE_MS);
  }, [state]);

  // Poll for changes made on other devices and pull them in.
  useEffect(() => {
    const id = setInterval(async () => {
      // Don't clobber unsaved local edits mid-flight.
      if (dirtyRef.current || savingRef.current || !hydratedRef.current) return;
      try {
        const version = await fetchVersion();
        if (version !== versionRef.current) {
          const remote = await fetchBoard();
          if (remote.board && !dirtyRef.current && !savingRef.current) {
            applyRemote(remote.board, remote.version);
          }
        }
        setStatus((s) => (s === 'offline' ? 'synced' : s));
      } catch {
        setStatus('offline');
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [applyRemote]);

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
    status,
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
