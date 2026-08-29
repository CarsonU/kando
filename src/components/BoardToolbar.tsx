import { useEffect, useRef, useState } from 'react';
import type { BoardApi } from '../useBoard';

interface BoardToolbarProps {
  api: BoardApi;
  sortByDue: boolean;
  onToggleSort: () => void;
  filterTagIds: string[];
  onFilterChange: (tagIds: string[]) => void;
  archivedCount: number;
  onOpenArchive: () => void;
}

export default function BoardToolbar({
  api,
  sortByDue,
  onToggleSort,
  filterTagIds,
  onFilterChange,
  archivedCount,
  onOpenArchive,
}: BoardToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close the filter popover on outside click or Escape.
  useEffect(() => {
    if (!filterOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFilterOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filterOpen]);

  const tags = Object.values(api.state.tags);
  const activeCount = filterTagIds.length;

  function toggleTag(tagId: string) {
    onFilterChange(
      filterTagIds.includes(tagId)
        ? filterTagIds.filter((id) => id !== tagId)
        : [...filterTagIds, tagId],
    );
  }

  return (
    <div className="app-toolbar">
      <button
        type="button"
        className={`toolbar-btn${sortByDue ? ' is-active' : ''}`}
        aria-pressed={sortByDue}
        onClick={onToggleSort}
        title="Order cards by due date (undated last)"
      >
        <SortIcon />
        Sort by due date
      </button>

      <div className="toolbar-filter" ref={filterRef}>
        <button
          type="button"
          className={`toolbar-btn${activeCount > 0 ? ' is-active' : ''}`}
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen((v) => !v)}
          title="Show only cards with the selected tags"
        >
          <FilterIcon />
          Filter
          {activeCount > 0 && <span className="toolbar-btn__badge">{activeCount}</span>}
        </button>

        {filterOpen && (
          <div className="toolbar-popover" role="menu">
            <div className="toolbar-popover__heading">
              <span>Filter by tag</span>
              {activeCount > 0 && (
                <button
                  type="button"
                  className="toolbar-popover__clear"
                  onClick={() => onFilterChange([])}
                >
                  Clear
                </button>
              )}
            </div>
            {tags.length > 0 ? (
              <ul className="toolbar-popover__list">
                {tags.map((tag) => {
                  const on = filterTagIds.includes(tag.id);
                  return (
                    <li key={tag.id}>
                      <button
                        type="button"
                        className={`toolbar-popover__option${on ? ' is-on' : ''}`}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <span
                          className="toolbar-popover__swatch"
                          style={{ background: tag.color }}
                        />
                        <span className="toolbar-popover__name">{tag.name}</span>
                        <span className="toolbar-popover__check" aria-hidden="true">
                          {on ? '✓' : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="toolbar-popover__empty">No tags yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="app-toolbar__spacer" />

      <button
        type="button"
        className="toolbar-btn"
        onClick={onOpenArchive}
        title="View archived cards"
      >
        <ArchiveIcon />
        Archive
        {archivedCount > 0 && <span className="toolbar-btn__badge">{archivedCount}</span>}
      </button>
    </div>
  );
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h12M3 12h9M3 18h6" />
      <path d="M18 9v9m0 0 3-3m-3 3-3-3" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
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
