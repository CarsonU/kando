import { Fragment, useRef, useState } from 'react';
import type { DragSource } from '../types';
import type { BoardApi } from '../useBoard';
import Column from './Column';

interface DropTarget {
  columnId: string;
  index: number;
}

interface BoardProps {
  api: BoardApi;
  sortByDue: boolean;
  filterTagIds: string[];
}

export default function Board({ api, sortByDue, filterTagIds }: BoardProps) {
  // Card drag context (moving cards within/between columns).
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // Column drag context (reordering columns) — kept separate so the two drag
  // interactions never interfere.
  const [columnDrag, setColumnDrag] = useState<string | null>(null);
  const [columnDropIndex, setColumnDropIndex] = useState<number | null>(null);

  const [addingColumn, setAddingColumn] = useState(false);
  const [columnDraft, setColumnDraft] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);

  function onCardDragStart(cardId: string, fromColumnId: string) {
    setDragging({ cardId, fromColumnId });
  }
  function onCardDragEnd() {
    setDragging(null);
    setDropTarget(null);
  }

  function onColumnDragStart(columnId: string) {
    setColumnDrag(columnId);
  }
  function onColumnDragEnd() {
    setColumnDrag(null);
    setColumnDropIndex(null);
  }

  /** Insertion index among columns (excluding the dragged one) from cursor X. */
  function computeColumnIndex(clientX: number): number {
    const board = boardRef.current;
    if (!board) return api.state.columns.length;
    const nodes = Array.from(
      board.querySelectorAll<HTMLElement>('[data-column-id]'),
    ).filter((node) => node.dataset.columnId !== columnDrag);
    let index = 0;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (clientX > rect.left + rect.width / 2) index += 1;
    }
    return index;
  }

  function handleBoardDragOver(e: React.DragEvent) {
    if (!columnDrag) return; // let card drag be handled inside the column
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const index = computeColumnIndex(e.clientX);
    if (columnDropIndex !== index) setColumnDropIndex(index);
  }

  function handleBoardDrop(e: React.DragEvent) {
    if (!columnDrag) return;
    e.preventDefault();
    api.moveColumn(columnDrag, computeColumnIndex(e.clientX));
    onColumnDragEnd();
  }

  function commitAddColumn() {
    if (columnDraft.trim()) api.addColumn(columnDraft);
    setColumnDraft('');
    setAddingColumn(false);
  }

  const columnIndicator = <div className="column-drop-indicator" aria-hidden="true" />;

  return (
    <div className="board" ref={boardRef} onDragOver={handleBoardDragOver} onDrop={handleBoardDrop}>
      {api.state.columns.map((column, i) => (
        <Fragment key={column.id}>
          {columnDrag && columnDropIndex === i && columnIndicator}
          <Column
            column={column}
            api={api}
            sortByDue={sortByDue}
            filterTagIds={filterTagIds}
            dragging={dragging}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
            onCardDragStart={onCardDragStart}
            onCardDragEnd={onCardDragEnd}
            isColumnDragging={columnDrag === column.id}
            onColumnDragStart={onColumnDragStart}
            onColumnDragEnd={onColumnDragEnd}
          />
        </Fragment>
      ))}
      {columnDrag && columnDropIndex === api.state.columns.length && columnIndicator}

      <div className="board__add-column">
        {addingColumn ? (
          <div className="composer composer--column">
            <input
              autoFocus
              className="composer__input"
              placeholder="Column name…"
              value={columnDraft}
              onChange={(e) => setColumnDraft(e.target.value)}
              onBlur={commitAddColumn}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitAddColumn();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setColumnDraft('');
                  setAddingColumn(false);
                }
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className="board__add-column-btn"
            onClick={() => setAddingColumn(true)}
          >
            + Add column
          </button>
        )}
      </div>
    </div>
  );
}
