import { useState } from 'react';
import Board from './components/Board';
import TagBoard from './components/TagBoard';
import BoardToolbar from './components/BoardToolbar';
import Settings from './components/Settings';
import Archive from './components/Archive';
import { useBoard, type SyncStatus } from './useBoard';

const STATUS_LABEL: Record<SyncStatus, string> = {
  connecting: 'connecting…',
  synced: 'synced',
  saving: 'saving…',
  offline: 'offline · local only',
};

export default function App() {
  const api = useBoard();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  // View options (not persisted): which screen (board vs by-tag), sort cards by
  // due date, and filter to cards carrying any of the selected tags.
  const [viewMode, setViewMode] = useState<'board' | 'tags'>('board');
  const [sortByDue, setSortByDue] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);

  const allCards = Object.values(api.state.cards);
  const cardCount = allCards.filter((c) => !c.archivedAt).length;
  const archivedCount = allCards.length - cardCount;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true" />
          <h1 className="app-header__title">Kando</h1>
        </div>
        <div className="app-header__right">
          <p className="app-header__meta">
            {api.state.columns.length} columns &middot; {cardCount} cards &middot;{' '}
            <span className={`app-header__status app-header__status--${api.status}`}>
              {STATUS_LABEL[api.status]}
            </span>
          </p>
          <button
            type="button"
            className="app-header__settings"
            aria-label="Settings"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <GearIcon />
          </button>
        </div>
      </header>
      <BoardToolbar
        api={api}
        viewMode={viewMode}
        onViewChange={setViewMode}
        sortByDue={sortByDue}
        onToggleSort={() => setSortByDue((v) => !v)}
        filterTagIds={filterTagIds}
        onFilterChange={setFilterTagIds}
        archivedCount={archivedCount}
        onOpenArchive={() => setArchiveOpen(true)}
      />
      <main className="app-main">
        {viewMode === 'board' ? (
          <Board api={api} sortByDue={sortByDue} filterTagIds={filterTagIds} />
        ) : (
          <TagBoard api={api} sortByDue={sortByDue} />
        )}
      </main>
      {settingsOpen && <Settings api={api} onClose={() => setSettingsOpen(false)} />}
      {archiveOpen && <Archive api={api} onClose={() => setArchiveOpen(false)} />}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
