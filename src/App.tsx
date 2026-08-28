import Board from './components/Board';
import { useBoard } from './useBoard';

export default function App() {
  const api = useBoard();
  const cardCount = Object.keys(api.state.cards).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true" />
          <h1 className="app-header__title">Kanban</h1>
        </div>
        <p className="app-header__meta">
          {api.state.columns.length} columns &middot; {cardCount} cards &middot; saved locally
        </p>
      </header>
      <main className="app-main">
        <Board api={api} />
      </main>
    </div>
  );
}
