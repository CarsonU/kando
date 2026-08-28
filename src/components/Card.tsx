import { useEffect, useRef, useState } from 'react';
import type { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
  columnId: string;
  isDragging: boolean;
  onDragStart: (cardId: string, fromColumnId: string) => void;
  onDragEnd: () => void;
  onUpdate: (cardId: string, title: string) => void;
  onDelete: (cardId: string) => void;
}

export default function Card({
  card,
  columnId,
  isDragging,
  onDragStart,
  onDragEnd,
  onUpdate,
  onDelete,
}: CardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editing]);

  function startEditing() {
    setDraft(card.title);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== card.title) {
      onUpdate(card.id, trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(card.title);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="card card--editing">
        <textarea
          ref={textareaRef}
          className="card__editor"
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`card${isDragging ? ' card--dragging' : ''}`}
      data-card-id={card.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Some browsers require data to be set for a drag to initiate.
        e.dataTransfer.setData('text/plain', card.id);
        onDragStart(card.id, columnId);
      }}
      onDragEnd={onDragEnd}
      onDoubleClick={startEditing}
    >
      <span className="card__title">{card.title}</span>
      <button
        type="button"
        className="card__delete"
        aria-label="Delete card"
        title="Delete card"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card.id);
        }}
      >
        &times;
      </button>
    </div>
  );
}
