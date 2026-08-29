import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { BoardApi } from '../useBoard';

interface ArchiveProps {
  api: BoardApi;
  onClose: () => void;
}

export default function Archive({ api, onClose }: ArchiveProps) {
  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const columnNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const col of api.state.columns) map[col.id] = col.title;
    return map;
  }, [api.state.columns]);

  // Archived cards, most recently archived first.
  const archived = useMemo(
    () =>
      Object.values(api.state.cards)
        .filter((c) => c.archivedAt)
        .sort((a, b) => (a.archivedAt! < b.archivedAt! ? 1 : -1)),
    [api.state.cards],
  );

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="archive-title">
        <header className="modal__header">
          <h2 id="archive-title" className="modal__title">
            Archive
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close archive"
            onClick={onClose}
          >
            &times;
          </button>
        </header>

        <div className="modal__body">
          {archived.length > 0 ? (
            <ul className="archive-list">
              {archived.map((card) => {
                const cardTags = card.tagIds
                  .map((id) => api.state.tags[id])
                  .filter((t): t is NonNullable<typeof t> => Boolean(t));
                const origin = card.archivedFrom
                  ? columnNames[card.archivedFrom]
                  : undefined;
                return (
                  <li key={card.id} className="archive-item">
                    <div className="archive-item__info">
                      {cardTags.length > 0 && (
                        <div className="archive-item__tags">
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
                      <span className="archive-item__title">{card.title}</span>
                      <span className="archive-item__meta">
                        {origin ? `from ${origin}` : 'from a deleted column'}
                        {card.dueDate ? ` · due ${card.dueDate}` : ''}
                      </span>
                    </div>
                    <div className="archive-item__actions">
                      <button
                        type="button"
                        className="archive-item__restore"
                        onClick={() => api.restoreCard(card.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="archive-item__delete"
                        onClick={() => {
                          if (window.confirm(`Permanently delete "${card.title}"?`)) {
                            api.deleteCard(card.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="settings-empty">
              No archived cards. Archive a card, or use “Archive all” on a column, to move
              finished work here.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
