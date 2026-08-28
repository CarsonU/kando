# Kanban

A clean, local-only kanban board. Columns and cards, drag-and-drop, and everything
saved in your browser — no server, no account, no database.

Built with **Vite + React + TypeScript**, styled with plain CSS (light/dark themes),
and packaged to build and run entirely in **Docker**.

## Features

- **Columns** — add, rename (click the title), and delete. Seeded with To Do / In Progress / Done on first run.
- **Cards** — add via the composer at the bottom of a column, double-click to edit, delete on hover.
- **Drag & drop** — reorder cards within a column and move them between columns, with a live drop indicator.
- **Persistence** — every change is auto-saved to `localStorage`; reload and it's still there.
- **Themes** — follows your OS light/dark preference.

## Run it with Docker

Requires only Docker (Desktop or Engine) with Compose v2.

**Development** — hot-reloading dev server:

```bash
docker compose up dev
```

Then open http://localhost:5173. Source is bind-mounted, so edits reload instantly.

**Production** — optimized build served by nginx:

```bash
docker compose up --build web
```

Then open http://localhost:8080.

Stop everything with:

```bash
docker compose down
```

## Run it without Docker

If you have Node 22+:

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Project layout

```
src/
  main.tsx            React entry
  App.tsx             Layout + header
  useBoard.ts         All board state + actions, auto-persisted to localStorage
  storage.ts          localStorage load/save + default seed
  types.ts            Card / Column / BoardState (normalized)
  components/
    Board.tsx         Columns row + drag context + add-column
    Column.tsx        Header, card list, drop logic, card composer
    Card.tsx          Draggable card with inline edit
  styles.css          Design tokens + all styles (light/dark)
Dockerfile            Multi-stage prod build -> nginx
Dockerfile.dev        Dev server image
docker-compose.yml    dev + web services
nginx.conf            SPA fallback for the nginx runtime
```

## Data model

State is normalized — columns hold an ordered list of card ids, and the cards live
in a lookup map — so moving and reordering is just splicing id arrays:

```ts
Card       = { id, title }
Column     = { id, title, cardIds }
BoardState = { columns: Column[], cards: Record<string, Card> }
```

Stored under the `localStorage` key `kanban-board-v1`.
