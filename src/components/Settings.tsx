import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BoardApi } from '../useBoard';
import type { Tag } from '../types';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '../palette';

interface SettingsProps {
  api: BoardApi;
  onClose: () => void;
}

export default function Settings({ api, onClose }: SettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // How many cards use each tag (shown next to the tag).
  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of Object.values(api.state.cards)) {
      for (const id of card.tagIds) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [api.state.cards]);

  const tags = Object.values(api.state.tags);

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        // Close only when the backdrop itself (not the panel) is pressed.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        ref={panelRef}
      >
        <header className="modal__header">
          <h2 id="settings-title" className="modal__title">
            Settings
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close settings"
            onClick={onClose}
          >
            &times;
          </button>
        </header>

        <div className="modal__body">
          <section className="settings-section">
            <h3 className="settings-section__title">Tags</h3>
            <p className="settings-section__hint">
              Rename, recolor, or delete tags. Changes apply to every card that uses them.
            </p>

            {tags.length > 0 ? (
              <ul className="settings-tags">
                {tags.map((tag) => (
                  <SettingsTagRow
                    key={tag.id}
                    tag={tag}
                    count={usage[tag.id] ?? 0}
                    onRename={(name) => api.updateTag(tag.id, { name })}
                    onRecolor={(color) => api.updateTag(tag.id, { color })}
                    onDelete={() => {
                      const n = usage[tag.id] ?? 0;
                      const suffix = n > 0 ? ` It's used on ${n} card${n === 1 ? '' : 's'}.` : '';
                      if (window.confirm(`Delete tag "${tag.name}"?${suffix}`)) {
                        api.deleteTag(tag.id);
                      }
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="settings-empty">No tags yet — add one below.</p>
            )}

            <NewTagRow onCreate={(name, color) => api.createTag(name, color)} />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface SettingsTagRowProps {
  tag: Tag;
  count: number;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
}

function SettingsTagRow({ tag, count, onRename, onRecolor, onDelete }: SettingsTagRowProps) {
  const [name, setName] = useState(tag.name);

  // Keep the field in sync if the tag changes elsewhere (e.g. a remote sync).
  useEffect(() => {
    setName(tag.name);
  }, [tag.name]);

  function commit() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== tag.name) onRename(trimmed);
    else setName(tag.name); // revert an empty/unchanged edit
  }

  return (
    <li className="settings-tag">
      <div className="settings-tag__main">
        <span
          className="tag-pill settings-tag__pill"
          style={{ ['--tag' as string]: tag.color }}
        >
          {name.trim() || tag.name}
        </span>
        <input
          className="settings-tag__name"
          value={name}
          aria-label={`Rename tag ${tag.name}`}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(); // commit directly; don't rely on blur() firing onBlur
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setName(tag.name);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <span className="settings-tag__count" title={`Used on ${count} card${count === 1 ? '' : 's'}`}>
          {count}
        </span>
        <button
          type="button"
          className="settings-tag__delete"
          aria-label={`Delete tag ${tag.name}`}
          title="Delete tag"
          onClick={onDelete}
        >
          &times;
        </button>
      </div>
      <div className="settings-tag__swatches" role="group" aria-label="Tag color">
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`settings-tag__color${c === tag.color ? ' is-selected' : ''}`}
            style={{ background: c }}
            aria-label={`Use color ${c}`}
            aria-pressed={c === tag.color}
            onClick={() => onRecolor(c)}
          />
        ))}
      </div>
    </li>
  );
}

interface NewTagRowProps {
  onCreate: (name: string, color: string) => string | null;
}

function NewTagRow({ onCreate }: NewTagRowProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_TAG_COLOR);

  function submit() {
    if (onCreate(name, color)) setName('');
  }

  return (
    <div className="settings-add">
      <input
        className="settings-add__input"
        placeholder="New tag name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="settings-add__swatches" role="group" aria-label="New tag color">
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`settings-tag__color${c === color ? ' is-selected' : ''}`}
            style={{ background: c }}
            aria-label={`Use color ${c}`}
            aria-pressed={c === color}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <button
        type="button"
        className="settings-add__button"
        disabled={!name.trim()}
        onClick={submit}
      >
        Add tag
      </button>
    </div>
  );
}
