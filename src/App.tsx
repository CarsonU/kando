import Board from './components/Board';
import { useBoard, type SyncStatus } from './useBoard';

const STATUS_LABEL: Record<SyncStatus, string> = {
  connecting: 'connecting…',
  synced: 'synced',
  saving: 'saving…',
  offline: 'offline · local only',
};

export default function App() {
  const api = useBoard();
  const cardCount = Object.keys(api.state.cards).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true" />
          <h1 className="app-header__title">Kando</h1>
        </div>
        <p className="app-header__meta">
          {api.state.columns.length} columns &middot; {cardCount} cards &middot;{' '}
          <span className={`app-header__status app-header__status--${api.status}`}>
            {STATUS_LABEL[api.status]}
          </span>
        </p>
      </header>
      <main className="app-main">
        <Board api={api} />
      </main>
    </div>
  );
}
