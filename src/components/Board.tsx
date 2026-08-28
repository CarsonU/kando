import { useState } from 'react';
import type { DragSource } from '../types';
import type { BoardApi } from '../useBoard';
import Column from './Column';

interface DropTarget {
  columnId: string;
  index: number;
}

interface BoardProps {
  api: BoardApi;
}

export default function Board({ api }: BoardProps) {
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnDraft, setColumnDraft] = useState('');

  function onCardDragStart(cardId: string, fromColumnId: string) {
    setDragging({ cardId, fromColumnId });
  }

  function onCardDragEnd() {
    setDragging(null);
    setDropTarget(null);
  }

  function commitAddColumn() {
    if (columnDraft.trim()) {
      api.addColumn(columnDraft);
    }
    setColumnDraft('');
    setAddingColumn(false);
  }

  return (
    <div className="board">
      {api.state.columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          api={api}
          dragging={dragging}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onCardDragStart={onCardDragStart}
          onCardDragEnd={onCardDragEnd}
        />
      ))}

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
