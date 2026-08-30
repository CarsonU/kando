import { useEffect, useMemo, useRef, useState } from 'react';
import type { Tag } from '../types';
import type { BoardApi } from '../useBoard';
import { orderCards } from '../cardOrder';
import Card from './Card';

interface TagColumnProps {
  api: BoardApi;
  /** The tag this column represents, or null for the "Untagged" column. */
  tag: Tag | null;
  sortByDue: boolean;
}

/**
 * A read-only column in the tag view: it groups every active card carrying a
 * given tag (or, when `tag` is null, cards with no tags). Cards can't be dragged
 * here; adding a card creates it in the first board column with this tag applied.
 */
export default function TagColumn({ api, tag, sortByDue }: TagColumnProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const addRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (adding) addRef.current?.focus();
  }, [adding]);

  const visibleIds = useMemo(() => {
    const ids = Object.values(api.state.cards)
      .filter((c) => {
        if (c.archivedAt) return false;
        return tag ? c.tagIds.includes(tag.id) : c.tagIds.length === 0;
      })
      .map((c) => c.id);
    return orderCards(ids, api.state.cards, { sortByDue });
  }, [api.state.cards, tag, sortByDue]);

  const firstColumnId = api.state.columns[0]?.id;

  function commitAdd() {
    if (draft.trim() && firstColumnId) {
      api.addCard(firstColumnId, draft, tag ? [tag.id] : []);
      setDraft('');
      addRef.current?.focus();
    } else {
      setAdding(false);
    }
  }

  return (
    <section className="column column--tag" data-tag-id={tag?.id ?? '__untagged'}>
      <header className="column__header">
        {tag ? (
          <span className="tag-column__swatch" style={{ background: tag.color }} />
        ) : (
          <span className="tag-column__swatch tag-column__swatch--none" aria-hidden="true" />
        )}
        <span className={`column__title column__title--static${tag ? '' : ' is-untagged'}`}>
          {tag ? tag.name : 'Untagged'}
        </span>
        <span className="column__count">{visibleIds.length}</span>
      </header>

      <div className="column__list">
        {visibleIds.map((cardId) => {
          const card = api.state.cards[cardId];
          if (!card) return null;
          return (
            <div key={cardId} className="column__slot">
              <Card card={card} columnId={firstColumnId ?? ''} isDragging={false} api={api} disableDrag />
            </div>
          );
        })}
        {visibleIds.length === 0 && <p className="tag-column__empty">No cards.</p>}
      </div>

      {firstColumnId ? (
        adding ? (
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
        )
      ) : null}
    </section>
  );
}
