import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Tag } from '../types';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '../palette';

interface TagPickerProps {
  anchorEl: HTMLElement | null;
  tags: Record<string, Tag>;
  assignedTagIds: string[];
  onToggle: (tagId: string) => void;
  onCreate: (name: string, color: string) => string | null;
  onDelete: (tagId: string) => void;
  onClose: () => void;
}

const WIDTH = 232;

export default function TagPicker({
  anchorEl,
  tags,
  assignedTagIds,
  onToggle,
  onCreate,
  onDelete,
  onClose,
}: TagPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_TAG_COLOR);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  // Position the portaled popover next to the anchor card, clamped to viewport.
  useLayoutEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    const height = rootRef.current?.offsetHeight ?? 280;
    const left = Math.min(Math.max(r.right - WIDTH, 8), window.innerWidth - WIDTH - 8);
    const top =
      r.bottom + 6 + height > window.innerHeight
        ? Math.max(8, r.top - height - 6)
        : r.bottom + 6;
    setPos({ top, left });
  }, [anchorEl]);

  // Close on outside click or Escape.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function submitNewTag() {
    const id = onCreate(name, color);
    if (id) {
      onToggle(id); // assign the freshly created tag to this card
      setName('');
    }
  }

  const tagList = Object.values(tags);

  return createPortal(
    <div
      className="tag-picker"
      ref={rootRef}
      style={{ top: pos.top, left: pos.left, width: WIDTH }}
    >
      <div className="tag-picker__heading">Tags</div>

      {tagList.length > 0 && (
        <ul className="tag-picker__list">
          {tagList.map((tag) => {
            const assigned = assignedTagIds.includes(tag.id);
            return (
              <li key={tag.id} className="tag-picker__row">
                <button
                  type="button"
                  className={`tag-picker__option${assigned ? ' is-assigned' : ''}`}
                  onClick={() => onToggle(tag.id)}
                >
                  <span className="tag-picker__swatch" style={{ background: tag.color }} />
                  <span className="tag-picker__name">{tag.name}</span>
                  <span className="tag-picker__check" aria-hidden="true">
                    {assigned ? '✓' : ''}
                  </span>
                </button>
                <button
                  type="button"
                  className="tag-picker__remove"
                  aria-label={`Delete tag ${tag.name}`}
                  title="Delete tag (removes it from all cards)"
                  onClick={() => {
                    if (window.confirm(`Delete tag "${tag.name}" from all cards?`)) {
                      onDelete(tag.id);
                    }
                  }}
                >
                  &times;
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="tag-picker__new">
        <input
          className="tag-picker__input"
          placeholder="New tag name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitNewTag();
            }
          }}
        />
        <div className="tag-picker__swatches">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`tag-picker__color${c === color ? ' is-selected' : ''}`}
              style={{ background: c }}
              aria-label={`Use color ${c}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <button
          type="button"
          className="tag-picker__add"
          disabled={!name.trim()}
          onClick={submitNewTag}
        >
          Add tag
        </button>
      </div>
    </div>,
    document.body,
  );
}
