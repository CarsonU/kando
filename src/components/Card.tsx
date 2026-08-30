import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Card as CardType } from '../types';
import type { BoardApi } from '../useBoard';
import TagPicker from './TagPicker';

interface CardProps {
  card: CardType;
  columnId: string;
  isDragging: boolean;
  api: BoardApi;
  onDragStart?: (cardId: string, fromColumnId: string) => void;
  onDragEnd?: () => void;
  /** When true the card cannot be dragged (used by the read-only tag view). */
  disableDrag?: boolean;
}

type DueStatus = 'overdue' | 'today' | 'upcoming';

/** Local (not UTC) parse of a 'YYYY-MM-DD' string. */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dueStatus(iso: string): DueStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseISODate(iso);
  if (due.getTime() < today.getTime()) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

function formatDue(iso: string): string {
  const d = parseISODate(iso);
  const status = dueStatus(iso);
  if (status === 'today') return 'Today';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Card({
  card,
  columnId,
  isDragging,
  api,
  onDragStart,
  onDragEnd,
  disableDrag = false,
}: CardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editing]);

  useEffect(() => {
    if (editingDate) dateRef.current?.focus();
  }, [editingDate]);

  function startEditing() {
    setDraft(card.title);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== card.title) api.updateCard(card.id, trimmed);
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

  const cardTags = card.tagIds
    .map((id) => api.state.tags[id])
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div
      ref={cardRef}
      className={`card${isDragging ? ' card--dragging' : ''}${
        card.priority ? ' card--priority' : ''
      }`}
      data-card-id={card.id}
      draggable={!disableDrag && !pickerOpen && !editingDate}
      onDragStart={(e) => {
        if (disableDrag) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);
        onDragStart?.(card.id, columnId);
      }}
      onDragEnd={onDragEnd}
    >
      {(cardTags.length > 0 || card.priority) && (
        <div className="card__tags">
          {card.priority && (
            <span className="card__priority-badge" title="Priority">
              !!!
            </span>
          )}
          {cardTags.map((tag) => (
            <span
              key={tag.id}
              className="tag-pill"
              style={{ '--tag': tag.color } as CSSProperties}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="card__body">
        <span className="card__title" onDoubleClick={startEditing}>
          {card.title}
        </span>
      </div>

      {(card.dueDate || editingDate) && (
        <div className="card__footer">
          {editingDate ? (
            <div className="card__date-edit">
              <input
                ref={dateRef}
                type="date"
                className="card__date-input"
                value={card.dueDate ?? ''}
                onChange={(e) =>
                  api.setCardDueDate(card.id, e.target.value ? e.target.value : null)
                }
                onBlur={() => setEditingDate(false)}
              />
              {card.dueDate && (
                <button
                  type="button"
                  className="card__date-clear"
                  onClick={() => {
                    api.setCardDueDate(card.id, null);
                    setEditingDate(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          ) : (
            card.dueDate && (
              <button
                type="button"
                className={`due-pill due-pill--${dueStatus(card.dueDate)}`}
                title="Edit due date"
                onClick={() => setEditingDate(true)}
              >
                <CalendarIcon />
                {formatDue(card.dueDate)}
              </button>
            )
          )}
        </div>
      )}

      <div className="card__actions">
        <button
          type="button"
          className="card__action"
          aria-label="Edit tags"
          title="Tags"
          onClick={() => setPickerOpen(true)}
        >
          <TagIcon />
        </button>
        <button
          type="button"
          className={`card__action${card.priority ? ' card__action--priority' : ''}`}
          aria-label={card.priority ? 'Remove priority' : 'Mark as priority'}
          aria-pressed={!!card.priority}
          title="Priority"
          onClick={() => api.toggleCardPriority(card.id)}
        >
          <FlagIcon />
        </button>
        <button
          type="button"
          className="card__action"
          aria-label="Set due date"
          title="Due date"
          onClick={() => setEditingDate((v) => !v)}
        >
          <CalendarIcon />
        </button>
        <button
          type="button"
          className="card__action"
          aria-label="Archive card"
          title="Archive"
          onClick={() => api.archiveCard(card.id)}
        >
          <ArchiveIcon />
        </button>
        <button
          type="button"
          className="card__action card__action--danger"
          aria-label="Delete card"
          title="Delete card"
          onClick={() => api.deleteCard(card.id)}
        >
          &times;
        </button>
      </div>

      {pickerOpen && (
        <TagPicker
          anchorEl={cardRef.current}
          tags={api.state.tags}
          assignedTagIds={card.tagIds}
          onToggle={(tagId) => api.toggleCardTag(card.id, tagId)}
          onCreate={api.createTag}
          onDelete={api.deleteTag}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function TagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V4h13l-2 4 2 4H4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}
