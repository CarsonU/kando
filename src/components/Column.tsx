import { useEffect, useMemo, useRef, useState } from 'react';
import type { Column as ColumnType, DragSource } from '../types';
import type { BoardApi } from '../useBoard';
import { orderCards } from '../cardOrder';
import Card from './Card';

interface DropTarget {
  columnId: string;
  index: number;
}

interface ColumnProps {
  column: ColumnType;
  api: BoardApi;
  sortByDue: boolean;
  filterTagIds: string[];
  collapsed: boolean;
  onToggleCollapse: (columnId: string) => void;
  dragging: DragSource | null;
  dropTarget: DropTarget | null;
  setDropTarget: (target: DropTarget | null) => void;
  onCardDragStart: (cardId: string, fromColumnId: string) => void;
  onCardDragEnd: () => void;
  isColumnDragging: boolean;
  onColumnDragStart: (columnId: string) => void;
  onColumnDragEnd: () => void;
}

export default function Column({
  column,
  api,
  sortByDue,
  filterTagIds,
  collapsed,
  onToggleCollapse,
  dragging,
  dropTarget,
  setDropTarget,
  onCardDragStart,
  onCardDragEnd,
  isColumnDragging,
  onColumnDragStart,
  onColumnDragEnd,
}: ColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const addRef = useRef<HTMLTextAreaElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (renaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renaming]);

  // The ids actually rendered: archived cards drop out (they're already removed
  // from cardIds, this is a guard), an active tag filter narrows to cards with a
  // matching tag, "sort by due date" reorders the visible set, and priority
  // cards float to the top. This is a view transform only — column.cardIds (the
  // saved order) is never mutated.
  const visibleIds = useMemo(() => {
    let ids = column.cardIds.filter((id) => {
      const c = api.state.cards[id];
      return c && !c.archivedAt;
    });
    if (filterTagIds.length > 0) {
      ids = ids.filter((id) =>
        api.state.cards[id].tagIds.some((t) => filterTagIds.includes(t)),
      );
    }
    return orderCards(ids, api.state.cards, { sortByDue });
  }, [column.cardIds, api.state.cards, filterTagIds, sortByDue]);

  /**
   * Compute where the dragged card should land, as an index into this column's
   * *visible* card list *excluding* the card being dragged. Counts how many
   * non-dragging cards have their vertical midpoint above the cursor.
   */
  function computeIndex(clientY: number): number {
    const container = listRef.current;
    if (!container) return column.cardIds.length;
    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-card-id]'),
    ).filter((node) => node.dataset.cardId !== dragging?.cardId);
    let index = 0;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (clientY > rect.top + rect.height / 2) index += 1;
    }
    return index;
  }

  function handleDragOver(e: React.DragEvent) {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Collapsed columns show no cards to measure, so the card always appends to
    // the end; just flag the column as the drop target for the highlight.
    if (collapsed) {
      if (dropTarget?.columnId !== column.id) {
        setDropTarget({ columnId: column.id, index: column.cardIds.length });
      }
      return;
    }
    const index = computeIndex(e.clientY);
    if (dropTarget?.columnId !== column.id || dropTarget.index !== index) {
      setDropTarget({ columnId: column.id, index });
    }
  }

  function handleDrop(e: React.DragEvent) {
    if (!dragging) return;
    e.preventDefault();
    if (collapsed) {
      api.moveCard(dragging.cardId, column.id, column.cardIds.length);
      onCardDragEnd();
      return;
    }
    // computeIndex is relative to the visible list; translate it back to an
    // index into the full cardIds array so filtering/sorting can't misplace the
    // card, by locating the visible card it should land in front of.
    const visibleIndex = computeIndex(e.clientY);
    const visibleNonDragging = visibleIds.filter((id) => id !== dragging.cardId);
    const anchorId = visibleNonDragging[visibleIndex] ?? null;
    const fullNonDragging = column.cardIds.filter((id) => id !== dragging.cardId);
    const realIndex = anchorId
      ? Math.max(0, fullNonDragging.indexOf(anchorId))
      : fullNonDragging.length;
    api.moveCard(dragging.cardId, column.id, realIndex);
    onCardDragEnd();
  }

  function commitAdd() {
    if (draft.trim()) {
      api.addCard(column.id, draft);
      setDraft('');
      // Keep composer open for rapid entry of multiple cards.
      addRef.current?.focus();
    } else {
      setAdding(false);
    }
  }

  function commitRename() {
    if (titleDraft.trim() && titleDraft.trim() !== column.title) {
      api.renameColumn(column.id, titleDraft);
    }
    setRenaming(false);
  }

  // Anchor card that the drop indicator should render before (null => at end).
  const isDropCol = dropTarget?.columnId === column.id;
  const visibleNonDragging = visibleIds.filter((id) => id !== dragging?.cardId);
  const anchorId =
    isDropCol && dropTarget ? visibleNonDragging[dropTarget.index] ?? null : undefined;

  const dropIndicator = <div className="drop-indicator" aria-hidden="true" />;

  if (collapsed) {
    return (
      <section
        className={`column column--collapsed${isDropCol ? ' column--drop' : ''}${
          isColumnDragging ? ' column--dragging' : ''
        }`}
        data-column-id={column.id}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className="column__grip"
          draggable
          role="button"
          aria-label="Drag to reorder column"
          title="Drag to reorder"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', column.id);
            onColumnDragStart(column.id);
          }}
          onDragEnd={onColumnDragEnd}
        >
          <GripIcon />
        </div>
        <button
          type="button"
          className="column__collapse"
          aria-label="Expand column"
          aria-expanded={false}
          title="Expand column"
          onClick={() => onToggleCollapse(column.id)}
        >
          <ChevronIcon direction="right" />
        </button>
        <button
          type="button"
          className="column__rail-title"
          title="Expand column"
          onClick={() => onToggleCollapse(column.id)}
        >
          {column.title}
        </button>
        <span className="column__count">{visibleIds.length}</span>
      </section>
    );
  }

  return (
    <section
      className={`column${isDropCol ? ' column--drop' : ''}${
        isColumnDragging ? ' column--dragging' : ''
      }`}
      data-column-id={column.id}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className="column__header">
        <div
          className="column__grip"
          draggable
          role="button"
          aria-label="Drag to reorder column"
          title="Drag to reorder"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', column.id);
            onColumnDragStart(column.id);
          }}
          onDragEnd={onColumnDragEnd}
        >
          <GripIcon />
        </div>
        <button
          type="button"
          className="column__collapse"
          aria-label="Collapse column"
          aria-expanded={true}
          title="Collapse column"
          onClick={() => onToggleCollapse(column.id)}
        >
          <ChevronIcon direction="left" />
        </button>
        {renaming ? (
          <input
            ref={renameRef}
            className="column__title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitRename();
              } else if (e.key === 'Escape') {
                setTitleDraft(column.title);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="column__title"
            title="Rename column"
            onClick={() => {
              setTitleDraft(column.title);
              setRenaming(true);
            }}
          >
            {column.title}
          </button>
        )}
        <span className="column__count">{visibleIds.length}</span>
        {column.cardIds.length > 0 && (
          <button
            type="button"
            className="column__archive-all"
            aria-label="Archive all cards in column"
            title="Archive all cards"
            onClick={() => api.archiveAllInColumn(column.id)}
          >
            <ArchiveIcon />
          </button>
        )}
        <button
          type="button"
          className="column__delete"
          aria-label="Delete column"
          title="Delete column"
          onClick={() => {
            const count = column.cardIds.length;
            if (count === 0 || window.confirm(`Delete "${column.title}" and its ${count} card(s)?`)) {
              api.deleteColumn(column.id);
            }
          }}
        >
          &times;
        </button>
      </header>

      <div className="column__list" ref={listRef}>
        {visibleIds.map((cardId) => {
          const card = api.state.cards[cardId];
          if (!card) return null;
          return (
            <div key={cardId} className="column__slot">
              {anchorId === cardId && dropIndicator}
              <Card
                card={card}
                columnId={column.id}
                isDragging={dragging?.cardId === cardId}
                api={api}
                onDragStart={onCardDragStart}
                onDragEnd={onCardDragEnd}
              />
            </div>
          );
        })}
        {isDropCol && anchorId === null && dropIndicator}
      </div>

      {adding ? (
        <div className="composer">
          <textarea
            ref={addRef}
            className="composer__input"
            placeholder="Card text…"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitAdd();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft('');
                setAdding(false);
              }
            }}
          />
        </div>
      ) : (
        <button type="button" className="column__add" onClick={() => setAdding(true)}>
          + Add a card
        </button>
      )}
    </section>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}
